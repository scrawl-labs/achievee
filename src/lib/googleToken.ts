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

export const dbGoogleStore: GoogleStore = {
  async get(user) { return parseGoogleConn(await integrations.get(user, "google")); },
  async save(user, conn) { await integrations.save(user, "google", { ...conn }); },
};

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
   * KNOWN LIMIT: get -> save is not atomic, so a sign-in landing between the two can still be overwritten with "revoked"
   * (the user then reconnects by signing in again). Closing it needs an optimistic lock, e.g. an UPDATE conditioned on the
   * refresh token that was read.
   */
  async function markRevoked(user: string, used: GoogleConn) {
    const latest = await deps.store.get(user);
    if (latest && latest.refresh_token !== used.refresh_token) return;
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

  return { getGoogleAccessToken, revokeGoogleGrant };
}

const defaults = createGoogleTokenService({
  store: dbGoogleStore,
  fetchFn: (input, init) => fetch(input, init),
  now: () => Date.now(),
  credentials: () => ({ id: process.env.GOOGLE_CLIENT_ID ?? "", secret: process.env.GOOGLE_CLIENT_SECRET ?? "" }),
});

export const getGoogleAccessToken = (user: string): Promise<TokenResult> => defaults.getGoogleAccessToken(user);
export const revokeGoogleGrant = (user: string): Promise<void> => defaults.revokeGoogleGrant(user);

export type GoogleAccess = { status: "ok"; accessToken: string } | { status: "revoked" };

/**
 * Token for reading Google data: the DB token first, the session's own access token when nothing is stored (or the DB
 * lookup/exchange fails transiently), so existing sessions keep working exactly as before.
 */
export async function resolveGoogleAccess(
  user: { id: string; accessToken: string },
  get: (id: string) => Promise<TokenResult> = getGoogleAccessToken,
): Promise<GoogleAccess> {
  try {
    const r = await get(user.id);
    if (r.status === "ok" || r.status === "revoked") return r;
  } catch {
    // transient failure: fall through to the session token
  }
  return { status: "ok", accessToken: user.accessToken };
}
