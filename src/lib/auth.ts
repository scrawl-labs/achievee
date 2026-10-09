import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { cookies, headers } from "next/headers";
import { cache } from "react";

const SCOPES = [
  "openid", "email", "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
].join(" ");

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
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
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
      authorization: { params: { scope: SCOPES, access_type: "offline", prompt: "consent" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: (account.expires_at ?? 0) * 1000,
        };
      }
      if (Date.now() < ((token.expiresAt as number) ?? 0) - 60_000) return token;
      return token.refreshToken ? refresh(token) : { ...token, error: "RefreshFailed" };
    },
    async session({ session, token }) {
      // The Google access token stays server-side (read via getToken in getUser); the client only learns who is signed in.
      (session as any).userId = token.sub;
      (session as any).error = token.error;
      return session;
    },
  },
};

/** The signed-in Google user (id = Google account id) with a fresh access token, or null → callers answer 401. */
export async function getUser() {
  const token = await getToken({
    req: {
      headers: Object.fromEntries(headers()),
      cookies: Object.fromEntries(cookies().getAll().map((c) => [c.name, c.value])),
    } as any,
  });
  if (!token?.sub || token.error) return null;
  let t: JWT = token;
  if (Date.now() >= ((t.expiresAt as number) ?? 0) - 60_000) {
    if (!t.refreshToken) return null;
    t = await refresh(t); // persisted into the cookie by the next /api/auth/session call
    if (t.error) return null;
  }
  return { id: token.sub, accessToken: t.accessToken as string };
}

/** Signed-in session for server components (cached per request); null when logged out or the Google token can no longer be refreshed. */
export const getSession = cache(async () => {
  const s = (await getServerSession(authOptions)) as any;
  return s?.user && !s.error ? s : null;
});
