import { integrations } from "./db";

// The Google refresh token lives in the `integration` table (provider "google", encrypted JSON), so the server can read
// Google data without the user's browser session. Nothing in this file may log or return a token.

export type GoogleStatus = "connected" | "revoked";
export type GoogleConn = { refresh_token: string; scope: string; connected_at: string; status: GoogleStatus };
export type GoogleStore = {
  get(user: string): Promise<GoogleConn | null>;
  save(user: string, conn: GoogleConn): Promise<void>;
};
export type TokenResult = { status: "ok"; accessToken: string } | { status: "revoked" } | { status: "none" };

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SAFETY_MARGIN_MS = 60_000;
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const FETCH_TIMEOUT_MS = 5_000; // a hung Google call must not hold the request; a timeout is a transient error, never "revoked"
const FAILED = "google token exchange failed"; // fixed text: upstream bodies/errors can echo credentials

export function parseGoogleConn(cfg: Record<string, string> | null): GoogleConn | null {
  if (!cfg || typeof cfg.refresh_token !== "string" || !cfg.refresh_token) return null;
  return {
    refresh_token: cfg.refresh_token, scope: cfg.scope ?? "", connected_at: cfg.connected_at ?? "",
    status: cfg.status === "revoked" ? "revoked" : "connected",
  };
}

/** What the browser may learn about the Google connection: a bare status. */
export function maskGoogleStatus(conn: GoogleConn | null): "connected" | "revoked" | "none" {
  return conn ? conn.status : "none";
}

// A marker row left by an explicit disconnect. Without it a pre-B session (which still holds its own Google tokens) would
// be read as "connected" again and the lazy migration would write the dead token back.
const DISCONNECTED = "google_disconnected";

export const dbGoogleStore = {
  async get(user: string) { return parseGoogleConn(await integrations.get(user, "google")); },
  /** A stored connection supersedes the disconnect marker. */
  async save(user: string, conn: GoogleConn) {
    await integrations.save(user, "google", { ...conn });
    await integrations.remove(user, DISCONNECTED);
  },
  /** Marker first, row second: no moment where neither exists. */
  async remove(user: string) {
    await integrations.save(user, DISCONNECTED, { at: new Date().toISOString() });
    await integrations.remove(user, "google");
  },
  async isDisconnected(user: string) { return (await integrations.get(user, DISCONNECTED)) !== null; },
} satisfies GoogleStore & { remove(user: string): Promise<void>; isDisconnected(user: string): Promise<boolean> };

export type TokenDeps = {
  store: GoogleStore;
  fetchFn: typeof fetch;
  now: () => number;
  credentials: () => { id: string; secret: string };
};

type Exchange = { kind: "ok"; accessToken: string; expiresAt: number } | { kind: "revoked" };

export function createGoogleTokenService(deps: TokenDeps) {
  const cache = new Map<string, { accessToken: string; expiresAt: number }>(); // in-memory only, never persisted

  async function exchange(refreshToken: string): Promise<Exchange> {
    const { id, secret } = deps.credentials();
    let res: Response;
    try {
      res = await deps.fetchFn(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: "refresh_token", refresh_token: refreshToken }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      throw new Error(FAILED); // network error: retryable, say nothing about the cause
    }
    const data = (await res.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown; error?: unknown } | null;
    if (res.ok && typeof data?.access_token === "string" && data.access_token) {
      const ttl = typeof data.expires_in === "number" ? data.expires_in : 3600;
      return { kind: "ok", accessToken: data.access_token, expiresAt: deps.now() + ttl * 1000 };
    }
    // Only invalid_grant proves the grant is gone. 5xx, rate limits and invalid_client (our config) must stay retryable.
    if (res.status === 400 && data?.error === "invalid_grant") return { kind: "revoked" };
    throw new Error(FAILED);
  }

  /**
   * Mark revoked, unless a newer token was stored while we were talking to Google.
   * KNOWN LIMIT: get -> save is not atomic, so a reconnect landing between the two can still be overwritten with "revoked"
   * (the user then connects again). Closing it needs an optimistic lock, e.g. an UPDATE conditioned on the
   * refresh token that was read.
   */
  async function markRevoked(user: string, used: GoogleConn) {
    const latest = await deps.store.get(user);
    // Row gone (disconnect / account deletion) or replaced (reconnect): the token we used is no longer the connection, so
    // writing "revoked" would resurrect a deleted row or clobber a fresh grant.
    if (!latest || latest.refresh_token !== used.refresh_token) return;
    await deps.store.save(user, { ...used, status: "revoked" });
  }

  const inflight = new Map<string, Promise<TokenResult>>(); // one exchange per user at a time

  function getGoogleAccessToken(user: string): Promise<TokenResult> {
    const running = inflight.get(user);
    if (running) return running;
    const p = lookup(user).finally(() => inflight.delete(user)); // removed on success and on failure, so a retry can start
    inflight.set(user, p);
    return p;
  }

  async function lookup(user: string): Promise<TokenResult> {
    const conn = await deps.store.get(user);
    if (!conn) { cache.delete(user); return { status: "none" }; }
    if (conn.status === "revoked") { cache.delete(user); return { status: "revoked" }; }
    const hit = cache.get(user);
    if (hit && deps.now() < hit.expiresAt - SAFETY_MARGIN_MS) return { status: "ok", accessToken: hit.accessToken };
    const r = await exchange(conn.refresh_token);
    if (r.kind === "revoked") {
      cache.delete(user);
      await markRevoked(user, conn);
      return { status: "revoked" };
    }
    cache.set(user, { accessToken: r.accessToken, expiresAt: r.expiresAt });
    return { status: "ok", accessToken: r.accessToken };
  }

  /**
   * Best effort, called when the account is deleted: tells Google to drop the grant behind the stored refresh token.
   * Without it a stale session could re-save that token after the data is gone (see the limit noted in /api/account).
   * Never throws; no token or response is logged.
   */
  async function revokeGoogleGrant(user: string): Promise<void> {
    try {
      const conn = await deps.store.get(user);
      if (!conn) return;
      await deps.fetchFn(REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: conn.refresh_token }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      // deletion must go on regardless
    }
  }

  /** Forget the cached access token (after the stored connection was replaced or removed). */
  function invalidate(user: string): void { cache.delete(user); }

  return { getGoogleAccessToken, revokeGoogleGrant, invalidate };
}

const defaults = createGoogleTokenService({
  store: dbGoogleStore,
  fetchFn: (input, init) => fetch(input, init),
  now: () => Date.now(),
  credentials: () => ({ id: process.env.GOOGLE_CLIENT_ID ?? "", secret: process.env.GOOGLE_CLIENT_SECRET ?? "" }),
});

export const getGoogleAccessToken = (user: string): Promise<TokenResult> => defaults.getGoogleAccessToken(user);
export const revokeGoogleGrant = (user: string): Promise<void> => defaults.revokeGoogleGrant(user);
export const invalidateGoogleToken = (user: string): void => defaults.invalidate(user);

/** "Disconnect Google Calendar": revoke at Google (best effort), drop the stored connection, forget cached tokens. */
export async function disconnectGoogle(user: string): Promise<void> {
  await defaults.revokeGoogleGrant(user); // never throws
  await dbGoogleStore.remove(user);
  defaults.invalidate(user);
}

export type GoogleAccess = { status: "ok"; accessToken: string } | { status: "revoked" } | { status: "none" };

/**
 * Token for reading Google data: the DB token first. When nothing is stored (or the lookup fails transiently) a session
 * that still carries its own calendar token (signed in before login and calendar access were split) keeps working.
 * A login-only session has an empty accessToken: that is "none" -- Google is never called with a token that would 403.
 */
export async function resolveGoogleAccess(
  user: { id: string; accessToken: string },
  get: (id: string) => Promise<TokenResult> = getGoogleAccessToken,
  isDisconnected: (id: string) => Promise<boolean> = dbGoogleStore.isDisconnected,
): Promise<GoogleAccess> {
  let r: TokenResult;
  try {
    r = await get(user.id);
  } catch (e) {
    if (user.accessToken) return { status: "ok", accessToken: user.accessToken }; // transient failure: keep the old behaviour
    throw e; // no fallback and no answer: a real error, not "not connected"
  }
  if (r.status !== "none") return r;
  if (!user.accessToken) return { status: "none" };
  // Deliberate fail-open: if the marker lookup fails we serve the session token, like before the DB token existed, rather
  // than blank the calendar of a user who did not disconnect. Limit: during a DB outage a user who DID disconnect still
  // sees data from a pre-split session token until it expires (at most ~1h; revoked at Google, refresh then fails).
  const off = await isDisconnected(user.id).catch(() => false);
  return off ? { status: "none" } : { status: "ok", accessToken: user.accessToken };
}
