import type { JWT } from "next-auth/jwt";
import { hasGoogleScopes } from "./googleMigration";

// Signing in and reading Google data are separate. A session only carries Google tokens when its grant includes the
// calendar/tasks scopes (sessions created before the login scopes were narrowed). Everything else is login-only.

/**
 * Whether this session's own Google tokens can be used for Calendar/Tasks.
 * Sessions issued before the scope was tracked (no `scope` field) are legacy: every earlier sign-in requested the
 * calendar/tasks scopes, so any token they hold is treated as carrying them, and the first refresh fills `scope` in
 * from Google's answer so the grant is moved to the DB. A session with no tokens at all is login-only.
 */
export const sessionHasGoogle = (t: Record<string, unknown>): boolean => {
  const hasToken = (typeof t.refreshToken === "string" && t.refreshToken !== "") || (typeof t.accessToken === "string" && t.accessToken !== "");
  if (!hasToken) return false;
  return typeof t.scope === "string" ? hasGoogleScopes(t.scope) : true;
};

/** Fields a fresh sign-in puts into the JWT: Google tokens only when the grant actually covers calendar/tasks. */
export function sessionFieldsFromAccount(a: { access_token?: string; refresh_token?: string; scope?: string; expires_at?: number }) {
  if (!sessionHasGoogle({ refreshToken: a.refresh_token, accessToken: a.access_token, scope: a.scope ?? "" })) return { scope: a.scope };
  return { accessToken: a.access_token, refreshToken: a.refresh_token, scope: a.scope, expiresAt: (a.expires_at ?? 0) * 1000 };
}

/** Drops the Google tokens (a dead or login-only grant) without touching who is signed in. */
export const detachGoogle = (t: JWT): JWT => ({ ...t, accessToken: undefined, refreshToken: undefined, expiresAt: undefined, error: undefined });

const SAFETY_MARGIN_MS = 60_000;

/**
 * The session token with its Google part brought up to date: refreshed when expired, detached when it cannot be used.
 * A failed refresh never ends the login; the stored (DB) connection is what serves Google data from then on.
 */
export async function settleGoogleSession(token: JWT, now: number, refresh: (t: JWT) => Promise<JWT>): Promise<JWT> {
  if (!sessionHasGoogle(token)) return token.accessToken || token.refreshToken || token.error ? detachGoogle(token) : token;
  if (now < ((token.expiresAt as number) ?? 0) - SAFETY_MARGIN_MS) return token;
  if (typeof token.refreshToken !== "string" || token.refreshToken === "") return detachGoogle(token); // expired and nothing to refresh with
  const next = await refresh(token);
  return next.error ? detachGoogle(next) : next;
}
