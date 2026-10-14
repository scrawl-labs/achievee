import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  buildAuthUrl, finishConnect, openConnectState, pkceChallenge, sealConnectState, startConnect, STATE_TTL_SEC,
  type ConnectDeps,
} from "@/lib/googleConnect";
import { GOOGLE_DATA_SCOPES, hasAllDataScopes } from "@/lib/googleScopes";
import type { GoogleConn, GoogleStore } from "@/lib/googleToken";

const SECRET = "test-secret-test-secret-test-secret";
const CLIENT = "client-id.apps.googleusercontent.com";
const REDIRECT = "http://localhost:3000/api/integrations/google/callback";
const ALL = ["openid", ...GOOGLE_DATA_SCOPES].join(" ");

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const idToken = (over: Record<string, unknown> = {}) =>
  `h.${b64({ iss: "https://accounts.google.com", aud: CLIENT, sub: "me", exp: 2_000_000, ...over })}.s`;

function make(over: Partial<ConnectDeps> = {}) {
  const clock = { t: 1_000_000_000 };
  let n = 0;
  const deps: ConnectDeps = {
    now: () => clock.t, // ms
    randomBytes: (len) => Buffer.alloc(len, ++n),
    secret: () => SECRET, clientId: () => CLIENT, clientSecret: () => "cs", redirectUri: REDIRECT,
    fetchFn: vi.fn() as unknown as typeof fetch,
    ...over,
  };
  return { deps, clock };
}
function memStore() {
  const saved: GoogleConn[] = [];
  const store: GoogleStore = { get: async () => null, save: async (_u, c) => { saved.push(c); } };
  return { store, saved };
}
const tokenRes = (body: Record<string, unknown>, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const goodBody = (over: Record<string, unknown> = {}) => ({ access_token: "AT", refresh_token: "RT", scope: ALL, id_token: idToken(), ...over });

describe("pkce / authorization url", () => {
  it("S256 challenge is base64url(sha256(verifier)), RFC 7636 vector", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    expect(pkceChallenge("abc")).toBe(createHash("sha256").update("abc").digest("base64url"));
  });
  it("builds the url with every required parameter", () => {
    const u = new URL(buildAuthUrl({ clientId: CLIENT, redirectUri: REDIRECT, state: "st", challenge: "ch", loginHint: "a@b.c" }));
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const p = u.searchParams;
    expect(p.get("client_id")).toBe(CLIENT);
    expect(p.get("redirect_uri")).toBe(REDIRECT);
    expect(p.get("response_type")).toBe("code");
    expect(p.get("scope")!.split(" ")).toEqual(["openid", ...GOOGLE_DATA_SCOPES]);
    expect(p.get("access_type")).toBe("offline");
    expect(p.get("prompt")).toBe("consent");
    expect(p.get("include_granted_scopes")).toBe("true");
    expect(p.get("code_challenge")).toBe("ch");
    expect(p.get("code_challenge_method")).toBe("S256");
    expect(p.get("state")).toBe("st");
    expect(p.get("login_hint")).toBe("a@b.c");
  });
  it("omits login_hint when unknown", () => {
    expect(new URL(buildAuthUrl({ clientId: CLIENT, redirectUri: REDIRECT, state: "s", challenge: "c" })).searchParams.has("login_hint")).toBe(false);
  });
});

describe("state cookie", () => {
  const payload = { state: "s", verifier: "v", user: "me", exp: 5000 };
  it("round-trips and is not readable", () => {
    const sealed = sealConnectState(payload, SECRET);
    expect(sealed).not.toContain("verifier");
    expect(Buffer.from(sealed, "base64url").toString("utf8")).not.toContain("\"v\"");
    expect(openConnectState(sealed, SECRET, 1000)).toEqual(payload);
  });
  it("rejects tampering, a wrong secret, expiry and garbage", () => {
    const sealed = sealConnectState(payload, SECRET);
    const raw = Buffer.from(sealed, "base64url"); raw[raw.length - 1] ^= 1;
    expect(openConnectState(raw.toString("base64url"), SECRET, 1000)).toBeNull();
    expect(openConnectState(sealed, "other-secret-other-secret-other", 1000)).toBeNull();
    expect(openConnectState(sealed, SECRET, 5000)).toBeNull();
    expect(openConnectState("", SECRET, 1000)).toBeNull();
    expect(openConnectState("%%%", SECRET, 1000)).toBeNull();
  });
});

describe("startConnect", () => {
  it("issues a url bound to a sealed cookie that expires in 10 minutes", () => {
    const { deps } = make();
    const r = startConnect(deps, { userId: "me", email: "a@b.c" });
    const u = new URL(r.url);
    const st = openConnectState(r.cookieValue, SECRET, deps.now())!;
    expect(st.state).toBe(u.searchParams.get("state"));
    expect(st.user).toBe("me");
    expect(u.searchParams.get("code_challenge")).toBe(pkceChallenge(st.verifier));
    expect(st.exp).toBe(deps.now() + STATE_TTL_SEC * 1000);
    expect(STATE_TTL_SEC).toBe(600);
    expect(r.cookieValue).not.toContain(st.verifier);
  });
  it("uses a fresh state and verifier every time", () => {
    const { deps } = make();
    const a = openConnectState(startConnect(deps, { userId: "me" }).cookieValue, SECRET, deps.now())!;
    const b = openConnectState(startConnect(deps, { userId: "me" }).cookieValue, SECRET, deps.now())!;
    expect(a.state).not.toBe(b.state);
    expect(a.verifier).not.toBe(b.verifier);
  });
});

describe("finishConnect", () => {
  function begin(fetchFn: typeof fetch, over: Partial<ConnectDeps> = {}) {
    const m = make({ fetchFn, ...over });
    const s = startConnect(m.deps, { userId: "me" });
    const st = openConnectState(s.cookieValue, SECRET, m.deps.now())!;
    return { ...m, cookie: s.cookieValue, state: st.state, verifier: st.verifier };
  }
  const run = (b: ReturnType<typeof begin>, store: GoogleStore, over: Record<string, unknown> = {}) =>
    finishConnect(b.deps, store, { userId: "me", code: "CODE", state: b.state, cookie: b.cookie, ...over });

  it("connected: exchanges code with PKCE verifier and overwrites the stored connection", async () => {
    const f = tokenRes(goodBody());
    const b = begin(f);
    const { store, saved } = memStore();
    expect(await run(b, store)).toBe("connected");
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("CODE");
    expect(body.get("code_verifier")).toBe(b.verifier);
    expect(body.get("redirect_uri")).toBe(REDIRECT);
    expect(body.get("client_secret")).toBe("cs");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(saved).toEqual([{ refresh_token: "RT", scope: ALL, connected_at: new Date(b.deps.now()).toISOString(), status: "connected" }]);
  });
  it("error param from Google", async () => {
    const f = tokenRes(goodBody()); const b = begin(f); const { store, saved } = memStore();
    expect(await run(b, store, { error: "access_denied" })).toBe("error");
    expect(f).not.toHaveBeenCalled(); expect(saved).toHaveLength(0);
  });
  it("missing cookie, tampered cookie, expired cookie", async () => {
    const f = tokenRes(goodBody()); const b = begin(f); const { store, saved } = memStore();
    expect(await run(b, store, { cookie: undefined })).toBe("error");
    expect(await run(b, store, { cookie: "garbage" })).toBe("error");
    b.clock.t += STATE_TTL_SEC * 1000 + 1;
    expect(await run(b, store)).toBe("error");
    expect(f).not.toHaveBeenCalled(); expect(saved).toHaveLength(0);
  });
  it("state mismatch / missing state / missing code", async () => {
    const f = tokenRes(goodBody()); const b = begin(f); const { store } = memStore();
    expect(await run(b, store, { state: "other" })).toBe("error");
    expect(await run(b, store, { state: undefined })).toBe("error");
    expect(await run(b, store, { code: undefined })).toBe("error");
    expect(f).not.toHaveBeenCalled();
  });
  it("cookie issued to another user is refused", async () => {
    const b = begin(tokenRes(goodBody())); const { store, saved } = memStore();
    expect(await run(b, store, { userId: "someone-else" })).toBe("error");
    expect(saved).toHaveLength(0);
  });
  it("sub mismatch: another Google account never gets stored", async () => {
    const b = begin(tokenRes(goodBody({ id_token: idToken({ sub: "attacker" }) }))); const { store, saved } = memStore();
    expect(await run(b, store)).toBe("error");
    expect(saved).toHaveLength(0);
  });
  it.each([
    ["missing id_token", { id_token: undefined }],
    ["wrong audience", { id_token: idToken({ aud: "other" }) }],
    ["wrong issuer", { id_token: idToken({ iss: "https://evil.example" }) }],
    ["expired id_token", { id_token: idToken({ exp: 1 }) }],
    ["malformed id_token", { id_token: "nope" }],
    ["no refresh_token", { refresh_token: undefined }],
  ])("rejects %s", async (_n, over) => {
    const b = begin(tokenRes(goodBody(over))); const { store, saved } = memStore();
    expect(await run(b, store)).toBe("error");
    expect(saved).toHaveLength(0);
  });
  it("partial: user unticked a scope; nothing is stored", async () => {
    const partial = ["openid", GOOGLE_DATA_SCOPES[0], GOOGLE_DATA_SCOPES[1]].join(" ");
    const b = begin(tokenRes(goodBody({ scope: partial }))); const { store, saved } = memStore();
    expect(await run(b, store)).toBe("partial");
    expect(saved).toHaveLength(0);
  });
  it("token endpoint failure, network failure, store failure", async () => {
    const { store } = memStore();
    expect(await run(begin(tokenRes({ error: "invalid_grant" }, 400)), store)).toBe("error");
    expect(await run(begin(vi.fn(async () => { throw new Error("boom"); }) as unknown as typeof fetch), store)).toBe("error");
    const failing: GoogleStore = { get: async () => null, save: async () => { throw new Error("db"); } };
    expect(await run(begin(tokenRes(goodBody())), failing)).toBe("error");
  });
});

describe("hasAllDataScopes", () => {
  it("needs every data scope", () => {
    expect(hasAllDataScopes(ALL)).toBe(true);
    expect(hasAllDataScopes("openid email")).toBe(false);
    expect(hasAllDataScopes(undefined)).toBe(false);
  });
});
