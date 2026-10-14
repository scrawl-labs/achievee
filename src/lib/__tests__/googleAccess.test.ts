import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ integrations: { get: vi.fn(), save: vi.fn(), remove: vi.fn() }, identity: { ensure: vi.fn() } }));

import type { JWT } from "next-auth/jwt";
import { resolveGoogleAccess, createGoogleTokenService, type GoogleConn, type GoogleStore, type TokenResult } from "@/lib/googleToken";
import { createGoogleMigrator } from "@/lib/googleMigration";
import { detachGoogle, sessionFieldsFromAccount, sessionHasGoogle, settleGoogleSession } from "@/lib/googleSession";
import { GOOGLE_DATA_SCOPES, LOGIN_SCOPES, loginScopeParam } from "@/lib/googleScopes";

const DATA = GOOGLE_DATA_SCOPES.join(" ");
const never = () => Promise.resolve(false);

describe("resolveGoogleAccess", () => {
  const get = (r: TokenResult | Error) => vi.fn(async () => { if (r instanceof Error) throw r; return r; });
  it("DB answer wins", async () => {
    expect(await resolveGoogleAccess({ id: "me", accessToken: "jwt" }, get({ status: "ok", accessToken: "db" }), never)).toEqual({ status: "ok", accessToken: "db" });
    expect(await resolveGoogleAccess({ id: "me", accessToken: "jwt" }, get({ status: "revoked" }), never)).toEqual({ status: "revoked" });
  });
  it("legacy session with a Google token and no row: falls back to the session token", async () => {
    expect(await resolveGoogleAccess({ id: "me", accessToken: "jwt" }, get({ status: "none" }), never)).toEqual({ status: "ok", accessToken: "jwt" });
  });
  it("new user (login-only session, empty token): none, never a Google call with a useless token", async () => {
    expect(await resolveGoogleAccess({ id: "me", accessToken: "" }, get({ status: "none" }), never)).toEqual({ status: "none" });
  });
  it("after disconnect the legacy session token is not resurrected", async () => {
    expect(await resolveGoogleAccess({ id: "me", accessToken: "jwt" }, get({ status: "none" }), async () => true)).toEqual({ status: "none" });
  });
  it("tombstone lookup failing falls back to the session token", async () => {
    const boom = async () => { throw new Error("db"); };
    expect(await resolveGoogleAccess({ id: "me", accessToken: "jwt" }, get({ status: "none" }), boom)).toEqual({ status: "ok", accessToken: "jwt" });
  });
  it("db failure: session token when there is one, otherwise the error surfaces (not a fake 'none')", async () => {
    expect(await resolveGoogleAccess({ id: "me", accessToken: "jwt" }, get(new Error("db")), never)).toEqual({ status: "ok", accessToken: "jwt" });
    await expect(resolveGoogleAccess({ id: "me", accessToken: "" }, get(new Error("db")), never)).rejects.toThrow();
  });
});

describe("login scopes", () => {
  it("login asks for identity only", () => {
    expect(loginScopeParam()).toBe("openid email profile");
    expect(LOGIN_SCOPES.some((s) => s.includes("calendar") || s.includes("tasks"))).toBe(false);
  });
});

describe("session google part", () => {
  const legacy: JWT = { sub: "me", refreshToken: "RT", scope: `openid ${DATA}`, accessToken: "AT", expiresAt: 10_000_000 };
  it("sessionHasGoogle: only with a refresh token and calendar+tasks scopes", () => {
    expect(sessionHasGoogle(legacy)).toBe(true);
    expect(sessionHasGoogle({ refreshToken: "RT", scope: "openid email profile" })).toBe(false);
    expect(sessionHasGoogle({ scope: `openid ${DATA}` })).toBe(false);
  });
  it("sessionFieldsFromAccount: login-only grants carry no Google tokens", () => {
    expect(sessionFieldsFromAccount({ access_token: "AT", scope: "openid email profile", expires_at: 5 })).toEqual({ scope: "openid email profile" });
    expect(sessionFieldsFromAccount({ access_token: "AT", refresh_token: "RT", scope: `openid ${DATA}`, expires_at: 5 }))
      .toEqual({ accessToken: "AT", refreshToken: "RT", scope: `openid ${DATA}`, expiresAt: 5000 });
  });
  it("legacy session without a scope field but with tokens counts as having calendar/tasks (old logins always requested them)", () => {
    expect(sessionHasGoogle({ refreshToken: "RT" })).toBe(true);
    expect(sessionHasGoogle({ accessToken: "AT" })).toBe(true);
    expect(sessionHasGoogle({ sub: "me" })).toBe(false); // login-only: no tokens at all
  });
  it("legacy session (no scope) is refreshed, not detached, and gets its scope filled so it migrates", async () => {
    const old: JWT = { sub: "me", refreshToken: "RT", accessToken: "AT", expiresAt: 10_000_000 };
    const refresh = vi.fn(async (t: JWT) => ({ ...t, accessToken: "AT2", expiresAt: 99_000_000, scope: `openid ${DATA}` }));
    const r = await settleGoogleSession(old, 20_000_000, refresh);
    expect(refresh).toHaveBeenCalledOnce();
    expect(r.refreshToken).toBe("RT");
    expect(r.scope).toBe(`openid ${DATA}`);
    expect(sessionHasGoogle(r)).toBe(true);
  });
  it("legacy session whose refresh fails keeps the login and drops only the tokens", async () => {
    const old: JWT = { sub: "me", refreshToken: "RT", accessToken: "AT", expiresAt: 10_000_000 };
    const r = await settleGoogleSession(old, 20_000_000, async (t) => ({ ...t, error: "RefreshFailed" }));
    expect(r.sub).toBe("me");
    expect(r.refreshToken).toBeUndefined();
    expect(r.accessToken).toBeUndefined();
  });
  it("legacy session with an expired access token and no refresh token is detached, not refreshed", async () => {
    const refresh = vi.fn();
    const r = await settleGoogleSession({ sub: "me", accessToken: "AT", expiresAt: 10_000_000 }, 20_000_000, refresh);
    expect(refresh).not.toHaveBeenCalled();
    expect(r.accessToken).toBeUndefined();
    expect(r.sub).toBe("me");
  });
  it("login-only session without any token is never refreshed", async () => {
    const refresh = vi.fn();
    const t: JWT = { sub: "me" };
    expect(await settleGoogleSession(t, 99_999_999_999, refresh)).toBe(t);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("login-only session is never refreshed and never fails (no logout after an hour)", async () => {
    const refresh = vi.fn();
    const t: JWT = { sub: "me", scope: "openid email profile" };
    expect(await settleGoogleSession(t, 99_999_999_999, refresh)).toBe(t);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("clears a stale RefreshFailed error from an old session", async () => {
    const r = await settleGoogleSession({ sub: "me", scope: "openid", error: "RefreshFailed" }, 1, vi.fn());
    expect(r.error).toBeUndefined();
    expect(r.sub).toBe("me");
  });
  it("legacy session: valid token untouched, expired token refreshed", async () => {
    const refresh = vi.fn(async (t: JWT) => ({ ...t, accessToken: "AT2", expiresAt: 99_000_000 }));
    expect(await settleGoogleSession(legacy, 1_000, refresh)).toBe(legacy);
    expect((await settleGoogleSession(legacy, 20_000_000, refresh)).accessToken).toBe("AT2");
  });
  it("legacy session whose refresh failed keeps the login but drops the dead Google token", async () => {
    const r = await settleGoogleSession(legacy, 20_000_000, async (t) => ({ ...t, error: "RefreshFailed" }));
    expect(r.sub).toBe("me");
    expect(r.accessToken).toBeUndefined();
    expect(r.refreshToken).toBeUndefined();
    expect(r.error).toBeUndefined();
    expect(detachGoogle(legacy).sub).toBe("me");
  });
});

describe("tombstone and cache", () => {
  const conn: GoogleConn = { refresh_token: "RT", scope: `openid ${DATA}`, connected_at: "x", status: "connected" };
  it("migration does not re-create a connection the user disconnected", async () => {
    const save = vi.fn(async () => undefined);
    const store: GoogleStore = { get: async () => null, save };
    const m = createGoogleMigrator({ store, now: () => 1, warn: () => undefined, isDisconnected: async () => true });
    await m.migrate("me", { refreshToken: "RT", scope: `openid ${DATA}` }, false);
    expect(save).not.toHaveBeenCalled();
  });
  it("invalidate drops the cached access token", async () => {
    let n = 0;
    const store: GoogleStore = { get: async () => conn, save: async () => undefined };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ access_token: `AT${++n}`, expires_in: 3600 }), { status: 200 }));
    const svc = createGoogleTokenService({ store, fetchFn: fetchFn as unknown as typeof fetch, now: () => 1, credentials: () => ({ id: "i", secret: "s" }) });
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "ok", accessToken: "AT1" });
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "ok", accessToken: "AT1" });
    svc.invalidate("me");
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "ok", accessToken: "AT2" });
  });
});
