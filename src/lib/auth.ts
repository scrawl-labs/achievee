import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { identity } from "./db";
import { loginScopeParam } from "./googleScopes";
import { sessionFieldsFromAccount, sessionHasGoogle, settleGoogleSession } from "./googleSession";
import { MIGRATION_TIMEOUT_MS, migrateGoogleFromJwt, succeedsWithin, warnGoogleStoreFailed } from "./googleMigration";

async function refresh(token: JWT): Promise<JWT> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
      signal: AbortSignal.timeout(5000), // a timeout lands in the catch below like any other refresh failure
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
      scope: data.scope ?? token.scope, // lets sessions that predate scope tracking be migrated to the DB
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshFailed" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Sign-in proves identity only. Calendar/Tasks access is requested later by /api/integrations/google/connect, so no
      // offline access or forced consent screen is needed here.
      authorization: { params: { scope: loginScopeParam() } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async signIn({ user, account }) {
      // Idempotent identity rows; a database problem must never block sign-in.
      if (account?.provider === "google" && user.id) {
        // a slow or failing db must not hold up or block the sign-in
        if (!(await succeedsWithin(identity.ensure(user.id, "google", account.providerAccountId), MIGRATION_TIMEOUT_MS))) warnGoogleStoreFailed();
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        if (token.sub) await migrateGoogleFromJwt(token.sub, { refreshToken: account.refresh_token, scope: account.scope }, true);
        return { ...token, ...sessionFieldsFromAccount(account) };
      }
      return settleGoogleSession(token, Date.now(), refresh); // login-only sessions have nothing to refresh and never expire on Google's clock
    },
    async session({ session, token }) {
      // The Google access token stays server-side (read via getToken in getUser); the client only learns who is signed in.
      (session as any).userId = token.sub;
      (session as any).error = token.error;
      return session;
    },
  },
};

/**
 * The signed-in user (id = Google account id). accessToken is the session's own Calendar/Tasks token, or "" for a
 * login-only session (nothing to call Google with: callers treat that as "not connected").
 */
export async function getUser() {
  const token = await getToken({
    req: {
      headers: Object.fromEntries(headers()),
      cookies: Object.fromEntries(cookies().getAll().map((c) => [c.name, c.value])),
    } as any,
  });
  if (!token?.sub) return null;
  const t = await settleGoogleSession(token, Date.now(), refresh); // persisted into the cookie by the next /api/auth/session call
  if (sessionHasGoogle(t)) await migrateGoogleFromJwt(token.sub, { refreshToken: t.refreshToken, scope: t.scope }, false); // never throws
  return {
    id: token.sub,
    email: typeof token.email === "string" ? token.email : undefined,
    accessToken: sessionHasGoogle(t) ? (t.accessToken as string) : "",
  };
}

/** Signed-in session for server components (cached per request); null when logged out or the Google token can no longer be refreshed. */
export const getSession = cache(async () => {
  const s = (await getServerSession(authOptions)) as any;
  return s?.user && !s.error ? s : null;
});
