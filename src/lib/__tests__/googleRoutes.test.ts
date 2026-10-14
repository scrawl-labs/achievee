import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, resolveGoogleAccess, revokeGoogleGrant, fetchMonth, fetchRange, list, get, deleteUserData, order } = vi.hoisted(() => ({
  getUser: vi.fn(), resolveGoogleAccess: vi.fn(), revokeGoogleGrant: vi.fn(), fetchMonth: vi.fn(), fetchRange: vi.fn(), list: vi.fn(), get: vi.fn(), deleteUserData: vi.fn(),
  order: [] as string[],
}));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/googleToken", async (orig) => ({ ...(await orig<typeof import("@/lib/googleToken")>()), resolveGoogleAccess, revokeGoogleGrant }));
vi.mock("@/lib/google", async (orig) => ({ ...(await orig<typeof import("@/lib/google")>()), fetchMonth, fetchRange }));
vi.mock("@/lib/db", () => ({ integrations: { list, get, save: vi.fn(), remove: vi.fn() }, identity: { ensure: vi.fn() }, deleteUserData }));

import { GET as month } from "@/app/api/month/route";
import { GET as events } from "@/app/api/events/route";
import { GET as integrationsGet } from "@/app/api/integrations/route";
import { GET as work } from "@/app/api/work/route";
import { DELETE as deleteAccount } from "@/app/api/account/route";

beforeEach(() => {
  vi.clearAllMocks();
  order.length = 0;
  get.mockResolvedValue(null);
  getUser.mockResolvedValue({ id: "me", accessToken: "jwt-token" });
  fetchMonth.mockResolvedValue({ "2026-10-01": { date: "2026-10-01", done: 0, total: 0, events: 0, tasks: [], eventList: [] } });
  fetchRange.mockResolvedValue([]);
});

describe("month / events with the DB token", () => {
  it("uses the resolved access token", async () => {
    resolveGoogleAccess.mockResolvedValue({ status: "ok", accessToken: "db-token" });
    const res = await month(new Request("http://x/api/month?ym=2026-10"));
    expect(fetchMonth).toHaveBeenCalledWith("2026-10", "db-token", expect.any(String));
    expect(await res.json()).not.toHaveProperty("google");
    await events(new Request("http://x/api/events?from=2026-10-01&to=2026-10-08"));
    expect(fetchRange).toHaveBeenCalledWith("2026-10-01", "2026-10-08", "db-token", expect.any(String));
  });

  it("revoked: normal 200 without calling Google, flag added, days skeleton kept", async () => {
    resolveGoogleAccess.mockResolvedValue({ status: "revoked" });
    const res = await month(new Request("http://x/api/month?ym=2026-10"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await res.json();
    expect(body.google).toBe("revoked");
    expect(Object.keys(body.days)).toHaveLength(31);
    expect(fetchMonth).not.toHaveBeenCalled();
    const ev = await events(new Request("http://x/api/events?from=2026-10-01&to=2026-10-08"));
    expect(ev.status).toBe(200);
    expect(await ev.json()).toEqual([]);
    expect(ev.headers.get("X-Google-Status")).toBe("revoked");
    expect(ev.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchRange).not.toHaveBeenCalled();
  });

  it("still 401 when signed out", async () => {
    getUser.mockResolvedValue(null);
    expect((await month(new Request("http://x/api/month?ym=2026-10"))).status).toBe(401);
  });
});

describe("GET /api/integrations", () => {
  it("masks google to a status and keeps the tool shape; no token in the payload", async () => {
    list.mockResolvedValue([{ provider: "github", config: { token: "gh-secret", label: "@me" } }]);
    get.mockResolvedValue({ refresh_token: "RT-secret", scope: "s", connected_at: "x", status: "revoked" });
    const text = await (await integrationsGet()).text();
    expect(JSON.parse(text)).toEqual([{ provider: "github", label: "@me" }, { provider: "google", status: "revoked" }]);
    expect(text).not.toContain("RT-secret");
    expect(text).not.toContain("gh-secret");
    expect(get).toHaveBeenCalledWith("me", "google");
  });
  it("reports none when there is no google row", async () => {
    list.mockResolvedValue([]);
    expect(await (await integrationsGet()).json()).toEqual([{ provider: "google", status: "none" }]);
  });
});

describe("DELETE /api/account", () => {
  it("revokes the Google grant first, then deletes the data", async () => {
    revokeGoogleGrant.mockImplementation(async () => { order.push("revoke"); });
    deleteUserData.mockImplementation(async () => { order.push("delete"); });
    const res = await deleteAccount();
    expect(res.status).toBe(200);
    expect(order).toEqual(["revoke", "delete"]);
    expect(revokeGoogleGrant).toHaveBeenCalledWith("me");
  });
  it("still deletes when the revoke fails or hangs", async () => {
    revokeGoogleGrant.mockRejectedValue(new Error("x"));
    expect((await deleteAccount()).status).toBe(200);
    expect(deleteUserData).toHaveBeenCalledWith("me");
  });
});

describe("GET /api/work", () => {
  it("does not treat the google row as a connected work tool", async () => {
    list.mockResolvedValue([{ provider: "google", config: { refresh_token: "RT", status: "connected" } }]);
    const body = await (await work(new Request("http://x/api/work?from=2026-10-01&to=2026-10-02"))).json();
    expect(body.connected).toEqual([]);
    expect(body.errors).toEqual([]);
  });
});
