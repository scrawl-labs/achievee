import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { connectScopeParam, hasAllDataScopes } from "./googleScopes";
import type { GoogleConn, GoogleStore } from "./googleToken";

// "Connect Google Calendar": our own OAuth authorization-code + PKCE flow, separate from sign-in (next-auth is not reused,
// so the logged-in session and account never change). Nothing here may log or return a token, code, verifier or state.

export const CONNECT_COOKIE = "google_connect";
export const CONNECT_COOKIE_PATH = "/api/integrations/google"; // sent to connect + callback only
export const STATE_TTL_SEC = 600;

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FETCH_TIMEOUT_MS = 5_000;
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export type ConnectDeps = {
  now: () => number;
  randomBytes: (n: number) => Buffer;
  secret: () => string; // signs/encrypts the state cookie
  clientId: () => string;
  clientSecret: () => string;
  redirectUri: string;
  fetchFn: typeof fetch;
};
export type ConnectState = { state: string; verifier: string; user: string; exp: number };
export type ConnectOutcome = "connected" | "partial" | "error";

export const pkceChallenge = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");

export function buildAuthUrl(i: { clientId: string; redirectUri: string; state: string; challenge: string; loginHint?: string }): string {
  const q = new URLSearchParams({
    client_id: i.clientId, redirect_uri: i.redirectUri, response_type: "code", scope: connectScopeParam(),
    access_type: "offline", prompt: "consent", include_granted_scopes: "true",
    code_challenge: i.challenge, code_challenge_method: "S256", state: i.state,
  });
  if (i.loginHint) q.set("login_hint", i.loginHint);
  return `${AUTH_URL}?${q}`;
}

// --- state cookie: AES-256-GCM (confidential + tamper-proof), key derived from the secret with a purpose label ---
const key = (secret: string): Buffer => Buffer.from(hkdfSync("sha256", secret, "", "achievee:google-connect-state:v1", 32));

export function sealConnectState(p: ConnectState, secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(secret), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(p), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64url");
}

const isState = (v: unknown): v is ConnectState => {
  const o = v as Partial<ConnectState> | null;
  return !!o && typeof o.state === "string" && typeof o.verifier === "string" && typeof o.user === "string" && typeof o.exp === "number";
};

/** The cookie's payload, or null when it is missing, forged, from another secret, malformed or expired. */
export function openConnectState(value: string | undefined, secret: string, now: number): ConnectState | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length < 29) return null;
    const d = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const parsed: unknown = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8"));
    return isState(parsed) && now < parsed.exp ? parsed : null;
  } catch {
    return null;
  }
}

export function startConnect(deps: ConnectDeps, who: { userId: string; email?: string }): { url: string; cookieValue: string } {
  const state = deps.randomBytes(32).toString("base64url");
  const verifier = deps.randomBytes(32).toString("base64url"); // 43 chars, within RFC 7636's 43..128
  const cookieValue = sealConnectState({ state, verifier, user: who.userId, exp: deps.now() + STATE_TTL_SEC * 1000 }, deps.secret());
  const url = buildAuthUrl({ clientId: deps.clientId(), redirectUri: deps.redirectUri, state, challenge: pkceChallenge(verifier), loginHint: who.email });
  return { url, cookieValue };
}

type TokenResponse = { refresh_token?: unknown; scope?: unknown; id_token?: unknown };

async function exchangeCode(deps: ConnectDeps, code: string, verifier: string): Promise<TokenResponse | null> {
  const res = await deps.fetchFn(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: deps.clientId(), client_secret: deps.clientSecret(), grant_type: "authorization_code",
      code, code_verifier: verifier, redirect_uri: deps.redirectUri,
    }).toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as TokenResponse | null;
}

/**
 * The Google account id (sub) inside an id_token we received straight from Google's token endpoint over TLS (OIDC Core
 * 3.1.3.7 allows skipping the signature check then). Audience, issuer and expiry are still checked.
 */
function idTokenSub(idToken: unknown, clientId: string, now: number): string | null {
  if (typeof idToken !== "string") return null;
  try {
    const c = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")) as { iss?: unknown; aud?: unknown; sub?: unknown; exp?: unknown };
    const ok = typeof c.iss === "string" && ISSUERS.includes(c.iss) && c.aud === clientId && typeof c.exp === "number" && c.exp * 1000 > now;
    return ok && typeof c.sub === "string" && c.sub !== "" ? c.sub : null;
  } catch {
    return null;
  }
}

const sameText = (a: string, b: string): boolean => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export type CallbackInput = { userId: string; code?: string; state?: string; error?: string; cookie?: string };

/** Decides the outcome of the redirect back from Google. Stores the connection only when every check passes. */
export async function finishConnect(deps: ConnectDeps, store: GoogleStore, input: CallbackInput): Promise<ConnectOutcome> {
  try {
    if (input.error || !input.code || !input.state) return "error";
    const st = openConnectState(input.cookie, deps.secret(), deps.now());
    if (!st || st.user !== input.userId || !sameText(st.state, input.state)) return "error";
    const tok = await exchangeCode(deps, input.code, st.verifier);
    if (!tok) return "error";
    // The grant must belong to the signed-in user, or a foreign calendar would be attached to this account.
    if (idTokenSub(tok.id_token, deps.clientId(), deps.now()) !== input.userId) return "error";
    if (typeof tok.refresh_token !== "string" || !tok.refresh_token) return "error";
    if (!hasAllDataScopes(tok.scope)) return "partial";
    const conn: GoogleConn = { refresh_token: tok.refresh_token, scope: tok.scope as string, connected_at: new Date(deps.now()).toISOString(), status: "connected" };
    await store.save(input.userId, conn);
    return "connected";
  } catch {
    return "error"; // fixed answer: the cause may carry credentials
  }
}
