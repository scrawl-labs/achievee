import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ integrations: { get: vi.fn(), save: vi.fn() }, identity: { ensure: vi.fn() } }));

import { createGoogleTokenService, maskGoogleStatus, parseGoogleConn, type GoogleConn, type GoogleStore } from "@/lib/googleToken";

const conn = (over: Partial<GoogleConn> = {}): GoogleConn => ({
  refresh_token: "RT-secret", scope: "s", connected_at: "2026-10-14T00:00:00.000Z", status: "connected", ...over,
});
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

function setup(initial: GoogleConn | null) {
  const rows = new Map<string, GoogleConn>();
  if (initial) rows.set("me", initial);
  const store: GoogleStore = {
    get: vi.fn(async (u: string) => rows.get(u) ?? null),
    save: vi.fn(async (u: string, c: GoogleConn) => { rows.set(u, c); }),
  };
  const fetchFn = vi.fn();
  const clock = { t: 1_000_000 };
  const svc = createGoogleTokenService({
    store, fetchFn: fetchFn as unknown as typeof fetch, now: () => clock.t, credentials: () => ({ id: "cid", secret: "csecret" }),
  });
  return { svc, store, fetchFn, rows, clock };
}

describe("getGoogleAccessToken", () => {
  beforeEach(() => vi.clearAllMocks());

  it("none when nothing is stored (no network call)", async () => {
    const { svc, fetchFn } = setup(null);
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "none" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("revoked when stored as revoked (no network call)", async () => {
    const { svc, fetchFn } = setup(conn({ status: "revoked" }));
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "revoked" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("exchanges the refresh token and caches the access token until near expiry", async () => {
    const { svc, fetchFn, clock } = setup(conn());
    fetchFn.mockResolvedValue(json(200, { access_token: "AT1", expires_in: 3600 }));
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "ok", accessToken: "AT1" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body as URLSearchParams);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("RT-secret");
    expect(body.get("client_id")).toBe("cid");
    await svc.getGoogleAccessToken("me");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    clock.t += 3600_000 - 30_000; // inside the 60s safety margin
    fetchFn.mockResolvedValue(json(200, { access_token: "AT2", expires_in: 3600 }));
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "ok", accessToken: "AT2" });
  });

  it("invalid_grant during a disconnect (row gone) does not resurrect a revoked row", async () => {
    const { svc, fetchFn, rows, store } = setup(conn());
    fetchFn.mockImplementation(async () => { rows.delete("me"); return json(400, { error: "invalid_grant" }); });
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "revoked" });
    expect(store.save).not.toHaveBeenCalled();
    expect(rows.has("me")).toBe(false);
  });

  it("invalid_grant during a reconnect (different token) leaves the new connection alone", async () => {
    const { svc, fetchFn, rows, store } = setup(conn());
    fetchFn.mockImplementation(async () => { rows.set("me", conn({ refresh_token: "NEW" })); return json(400, { error: "invalid_grant" }); });
    await svc.getGoogleAccessToken("me");
    expect(store.save).not.toHaveBeenCalled();
    expect(rows.get("me")!.refresh_token).toBe("NEW");
    expect(rows.get("me")!.status).toBe("connected");
  });

  it("invalid_grant marks the connection revoked and keeps the other fields", async () => {
    const { svc, fetchFn, rows } = setup(conn());
    fetchFn.mockResolvedValue(json(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." }));
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "revoked" });
    expect(rows.get("me")).toEqual(conn({ status: "revoked" }));
  });

  it("does not overwrite a newer token that was stored while the exchange was in flight", async () => {
    const { svc, fetchFn, rows } = setup(conn());
    fetchFn.mockImplementation(async () => { rows.set("me", conn({ refresh_token: "NEW" })); return json(400, { error: "invalid_grant" }); });
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "revoked" });
    expect(rows.get("me")?.refresh_token).toBe("NEW");
    expect(rows.get("me")?.status).toBe("connected");
  });

  it.each([
    ["5xx", () => json(503, { error: "backend_error" })],
    ["invalid_client (our config problem)", () => json(401, { error: "invalid_client" })],
    ["non-JSON body", () => new Response("<html>", { status: 502 })],
  ])("transient/other failure (%s) throws and never revokes", async (_n, res) => {
    const { svc, fetchFn, rows } = setup(conn());
    fetchFn.mockResolvedValue(res());
    await expect(svc.getGoogleAccessToken("me")).rejects.toThrow("google token exchange failed");
    expect(rows.get("me")?.status).toBe("connected");
  });

  it("network error throws and never revokes", async () => {
    const { svc, fetchFn, rows } = setup(conn());
    fetchFn.mockRejectedValue(new TypeError("fetch failed RT-secret"));
    await expect(svc.getGoogleAccessToken("me")).rejects.toThrow("google token exchange failed");
    await expect(svc.getGoogleAccessToken("me")).rejects.not.toThrow(/RT-secret/);
    expect(rows.get("me")?.status).toBe("connected");
  });

  it("a 200 without an access token is an error, not a success", async () => {
    const { svc, fetchFn } = setup(conn());
    fetchFn.mockResolvedValue(json(200, {}));
    await expect(svc.getGoogleAccessToken("me")).rejects.toThrow("google token exchange failed");
  });

  it("passes an abort signal and treats a timeout as a transient error (never revokes)", async () => {
    const { svc, fetchFn, rows } = setup(conn());
    fetchFn.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(svc.getGoogleAccessToken("me")).rejects.toThrow("google token exchange failed");
    expect(fetchFn.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(rows.get("me")?.status).toBe("connected");
  });

  it("shares one exchange between concurrent requests of the same user", async () => {
    const { svc, fetchFn } = setup(conn());
    fetchFn.mockImplementation(async () => { await Promise.resolve(); return json(200, { access_token: "AT", expires_in: 3600 }); });
    const rs = await Promise.all([1, 2, 3].map(() => svc.getGoogleAccessToken("me")));
    expect(rs).toEqual(Array(3).fill({ status: "ok", accessToken: "AT" }));
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("drops the shared exchange on failure so the next request can retry", async () => {
    const { svc, fetchFn } = setup(conn());
    fetchFn.mockResolvedValueOnce(json(503, {}));
    await expect(Promise.all([svc.getGoogleAccessToken("me"), svc.getGoogleAccessToken("me")])).rejects.toThrow();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    fetchFn.mockResolvedValueOnce(json(200, { access_token: "AT", expires_in: 3600 }));
    expect(await svc.getGoogleAccessToken("me")).toEqual({ status: "ok", accessToken: "AT" });
  });

  it("is scoped per user", async () => {
    const { svc } = setup(conn());
    expect(await svc.getGoogleAccessToken("someone-else")).toEqual({ status: "none" });
  });
});

describe("parseGoogleConn / maskGoogleStatus", () => {
  it("parses a stored config and rejects garbage", () => {
    expect(parseGoogleConn(conn() as unknown as Record<string, string>)).toEqual(conn());
    expect(parseGoogleConn(null)).toBeNull();
    expect(parseGoogleConn({ status: "connected" })).toBeNull();
    expect(parseGoogleConn({ refresh_token: "x", status: "weird" })?.status).toBe("connected");
  });
  it("masks to a bare status", () => {
    expect(maskGoogleStatus(null)).toBe("none");
    expect(maskGoogleStatus(conn())).toBe("connected");
    expect(maskGoogleStatus(conn({ status: "revoked" }))).toBe("revoked");
  });
});

describe("revokeGoogleGrant (account deletion)", () => {
  it("calls Google's revoke endpoint with the stored token and a timeout", async () => {
    const { svc, fetchFn } = setup(conn());
    fetchFn.mockResolvedValue(new Response("", { status: 200 }));
    await svc.revokeGoogleGrant("me");
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
    expect(new URLSearchParams(init.body as URLSearchParams).get("token")).toBe("RT-secret");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
  it("does nothing without a stored connection", async () => {
    const { svc, fetchFn } = setup(null);
    await svc.revokeGoogleGrant("me");
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it("never throws: network error, store error", async () => {
    const { svc, fetchFn, store } = setup(conn());
    fetchFn.mockRejectedValue(new Error("boom RT-secret"));
    await expect(svc.revokeGoogleGrant("me")).resolves.toBeUndefined();
    store.get = vi.fn(async () => { throw new Error("db"); });
    await expect(svc.revokeGoogleGrant("me")).resolves.toBeUndefined();
  });
});
