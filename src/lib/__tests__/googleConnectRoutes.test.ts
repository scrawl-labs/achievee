import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GOOGLE_DATA_SCOPES } from "@/lib/googleScopes";

const { getUser, rows } = vi.hoisted(() => ({ getUser: vi.fn(), rows: new Map<string, Record<string, string>>() }));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/db", () => ({
  integrations: {
    get: vi.fn(async (_u: string, p: string) => rows.get(p) ?? null),
    save: vi.fn(async (_u: string, p: string, c: Record<string, string>) => { rows.set(p, c); }),
    remove: vi.fn(async (_u: string, p: string) => { rows.delete(p); }),
    list: vi.fn(async () => []),
  },
  identity: { ensure: vi.fn() },
}));

import { GET as connect } from "@/app/api/integrations/google/connect/route";
import { GET as callback } from "@/app/api/integrations/google/callback/route";
import { DELETE as disconnect } from "@/app/api/integrations/google/route";
import { GET as integrationsGet } from "@/app/api/integrations/route";

const BASE = "http://localhost:3000";
const ALL = ["openid", ...GOOGLE_DATA_SCOPES].join(" ");
const idToken = (sub: string) => `h.${Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: "cid", sub, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.s`;
const tokenReply = (over: Record<string, unknown> = {}) => new Response(JSON.stringify({ access_token: "AT-secret", refresh_token: "RT-secret", scope: ALL, id_token: idToken("me"), ...over }), { status: 200 });

const env = { ...process.env };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  rows.clear();
  getUser.mockReset();
  getUser.mockResolvedValue({ id: "me", email: "me@example.com", accessToken: "" });
  Object.assign(process.env, { NEXTAUTH_URL: BASE, NEXTAUTH_SECRET: "s".repeat(32), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret" });
  fetchMock = vi.fn(async () => tokenReply());
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); Object.assign(process.env, env); });

/** Runs /connect and returns what the browser would send back to /callback. */
async function startFlow() {
  const res = await connect(new Request(`${BASE}/api/integrations/google/connect`));
  const cookie = res.headers.get("set-cookie")!;
  const state = new URL(res.headers.get("location")!).searchParams.get("state")!;
  return { res, cookie, state, cookieHeader: cookie.split(";")[0] };
}
const cb = (qs: string, cookieHeader?: string) =>
  callback(new Request(`${BASE}/api/integrations/google/callback?${qs}`, { headers: cookieHeader ? { cookie: cookieHeader } : {} }));

describe("GET /api/integrations/google/connect", () => {
  it("401 when signed out, before anything else", async () => {
    getUser.mockResolvedValue(null);
    const res = await connect(new Request(`${BASE}/api/integrations/google/connect`));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("302 to Google with PKCE and a hardened state cookie", async () => {
    const { res, cookie } = await startFlow();
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.origin).toBe("https://accounts.google.com");
    expect(loc.searchParams.get("redirect_uri")).toBe(`${BASE}/api/integrations/google/callback`);
    expect(loc.searchParams.get("login_hint")).toBe("me@example.com");
    expect(loc.searchParams.get("code_challenge_method")).toBe("S256");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=600/i);
    expect(cookie).toMatch(/Path=\/api\/integrations\/google/);
    expect(cookie).not.toMatch(/Secure/i); // test env is not production
    expect(cookie).not.toContain(loc.searchParams.get("state")!); // sealed, not readable
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });
  it("Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { cookie } = await startFlow();
    expect(cookie).toMatch(/Secure/i);
    vi.unstubAllEnvs();
  });
  it("misconfigured deployment redirects to a fixed error", async () => {
    delete process.env.NEXTAUTH_SECRET;
    const res = await connect(new Request(`${BASE}/api/integrations/google/connect`));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${BASE}/?tab=integrations&google=error`);
  });
});

describe("configuration warning", () => {
  it.each(["NEXTAUTH_URL", "NEXTAUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"])("missing %s: fixed warning, no values logged", async (name) => {
    delete process.env[name];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await connect(new Request(`${BASE}/api/integrations/google/connect`));
    await cb("code=SECRETCODE&state=SECRETSTATE");
    expect(warn).toHaveBeenCalledTimes(2);
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toMatch(/not configured/);
    for (const v of ["ssssssss", "csecret", "SECRETCODE", "SECRETSTATE", BASE]) expect(logged).not.toContain(v);
    warn.mockRestore();
  });
  it("no warning when configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await startFlow();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("GET /api/integrations/google/callback", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue(null);
    expect((await cb("code=c&state=s")).status).toBe(401);
  });
  it("connected: stores the grant, redirects to a fixed path, clears the cookie, exposes no token", async () => {
    const { state, cookieHeader } = await startFlow();
    const res = await cb(`code=AUTHCODE&state=${state}`, cookieHeader);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(`${BASE}/?tab=integrations&google=connected`);
    expect(res.headers.get("set-cookie")).toMatch(/google_connect=;/);
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
    expect(rows.get("google")).toMatchObject({ status: "connected", scope: ALL });
    expect(rows.has("google_disconnected")).toBe(false);
    const visible = `${res.headers.get("location")}${res.headers.get("set-cookie")}`;
    for (const secret of ["AT-secret", "RT-secret", "AUTHCODE", state]) expect(visible).not.toContain(secret);
    const list = await (await integrationsGet()).text();
    expect(list).toContain('"status":"connected"');
    expect(list).not.toContain("RT-secret");
  });
  it("reconnect overwrites a revoked row and drops the disconnect marker", async () => {
    rows.set("google", { refresh_token: "old", scope: "s", connected_at: "x", status: "revoked" });
    rows.set("google_disconnected", { at: "x" });
    const { state, cookieHeader } = await startFlow();
    await cb(`code=c&state=${state}`, cookieHeader);
    expect(rows.get("google")).toMatchObject({ refresh_token: "RT-secret", status: "connected" });
    expect(rows.has("google_disconnected")).toBe(false);
  });
  it.each([
    ["google error param", (s: string) => `error=access_denied&state=${s}`, true],
    ["state mismatch", () => "code=c&state=forged", true],
    ["no cookie", (s: string) => `code=c&state=${s}`, false],
  ])("%s -> error redirect, nothing stored, no Google call", async (_n, qs, withCookie) => {
    const { state, cookieHeader } = await startFlow();
    const res = await cb(qs(state), withCookie ? cookieHeader : undefined);
    expect(res.headers.get("location")).toBe(`${BASE}/?tab=integrations&google=error`);
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
    expect(rows.has("google")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("sub mismatch -> error, nothing stored", async () => {
    fetchMock.mockResolvedValue(tokenReply({ id_token: idToken("attacker") }));
    const { state, cookieHeader } = await startFlow();
    const res = await cb(`code=c&state=${state}`, cookieHeader);
    expect(res.headers.get("location")).toBe(`${BASE}/?tab=integrations&google=error`);
    expect(rows.has("google")).toBe(false);
  });
  it("missing scope -> partial, nothing stored", async () => {
    fetchMock.mockResolvedValue(tokenReply({ scope: "openid" }));
    const { state, cookieHeader } = await startFlow();
    const res = await cb(`code=c&state=${state}`, cookieHeader);
    expect(res.headers.get("location")).toBe(`${BASE}/?tab=integrations&google=partial`);
    expect(rows.has("google")).toBe(false);
  });
  it("no refresh_token -> error", async () => {
    fetchMock.mockResolvedValue(tokenReply({ refresh_token: undefined }));
    const { state, cookieHeader } = await startFlow();
    expect((await cb(`code=c&state=${state}`, cookieHeader)).headers.get("location")).toBe(`${BASE}/?tab=integrations&google=error`);
    expect(rows.has("google")).toBe(false);
  });
  it("attacker-supplied host/redirect params never influence the redirect", async () => {
    const { state, cookieHeader } = await startFlow();
    const res = await cb(`code=c&state=${state}&redirect=https://evil.example&next=//evil.example`, cookieHeader);
    expect(new URL(res.headers.get("location")!).origin).toBe(BASE);
  });
});

describe("DELETE /api/integrations/google", () => {
  it("401 when signed out", async () => {
    getUser.mockResolvedValue(null);
    expect((await disconnect()).status).toBe(401);
  });
  it("revokes at Google, deletes the row, leaves a marker, 204; status is none afterwards", async () => {
    rows.set("google", { refresh_token: "RT-secret", scope: ALL, connected_at: "x", status: "connected" });
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const res = await disconnect();
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(new URLSearchParams(init.body as string).get("token")).toBe("RT-secret");
    expect(rows.has("google")).toBe(false);
    expect(rows.has("google_disconnected")).toBe(true);
    expect(await (await integrationsGet()).json()).toEqual([{ provider: "google", status: "none" }]);
  });
  it("still deletes when Google is unreachable", async () => {
    rows.set("google", { refresh_token: "RT", scope: ALL, connected_at: "x", status: "connected" });
    fetchMock.mockRejectedValue(new Error("down"));
    expect((await disconnect()).status).toBe(204);
    expect(rows.has("google")).toBe(false);
  });
  it("works when nothing was connected", async () => {
    expect((await disconnect()).status).toBe(204);
  });
});
