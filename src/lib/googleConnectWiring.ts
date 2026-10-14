import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { CONNECT_COOKIE, CONNECT_COOKIE_PATH, STATE_TTL_SEC, type ConnectDeps, type ConnectOutcome } from "./googleConnect";

// Glue between the connect/callback routes and the injectable flow in googleConnect.ts.

const CALLBACK_PATH = "/api/integrations/google/callback";

/** Public base URL of the app (NEXTAUTH_URL, the same value next-auth uses), without a trailing slash; null when unset. */
export function appBase(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.NEXTAUTH_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

/** Real dependencies, or null when the deployment lacks what the flow needs (callers then answer a fixed error). */
export function defaultConnectDeps(env: NodeJS.ProcessEnv = process.env): ConnectDeps | null {
  const base = appBase(env);
  const secret = env.NEXTAUTH_SECRET;
  if (!base || !secret || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return {
    now: () => Date.now(),
    randomBytes: (n) => randomBytes(n),
    secret: () => secret,
    clientId: () => env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: () => env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: `${base}${CALLBACK_PATH}`,
    fetchFn: (input, init) => fetch(input, init),
  };
}

const cookieBase = (env: NodeJS.ProcessEnv) => ({
  httpOnly: true, sameSite: "lax" as const, path: CONNECT_COOKIE_PATH, secure: env.NODE_ENV === "production",
});

export function setConnectCookie(res: NextResponse, value: string, env: NodeJS.ProcessEnv = process.env): void {
  res.cookies.set(CONNECT_COOKIE, value, { ...cookieBase(env), maxAge: STATE_TTL_SEC });
}

export function clearConnectCookie(res: NextResponse, env: NodeJS.ProcessEnv = process.env): void {
  res.cookies.set(CONNECT_COOKIE, "", { ...cookieBase(env), maxAge: 0 });
}

/** Redirect to a fixed in-app path; only the outcome word (from a closed set) is ever put in the query. */
export function integrationsRedirect(reqUrl: string, outcome: ConnectOutcome | "error", env: NodeJS.ProcessEnv = process.env): NextResponse {
  const base = appBase(env) ?? new URL(reqUrl).origin;
  const res = NextResponse.redirect(new URL(`/?tab=integrations&google=${outcome}`, base), 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
