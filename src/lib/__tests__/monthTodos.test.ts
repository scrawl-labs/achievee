import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DayData } from "@/lib/types";

const { getUser, resolveGoogleAccess, fetchMonth, monthCounts, nativeMonth } = vi.hoisted(() => ({
  getUser: vi.fn(), resolveGoogleAccess: vi.fn(), fetchMonth: vi.fn(), monthCounts: vi.fn(), nativeMonth: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/googleToken", async (orig) => ({ ...(await orig<typeof import("@/lib/googleToken")>()), resolveGoogleAccess }));
vi.mock("@/lib/google", async (orig) => ({ ...(await orig<typeof import("@/lib/google")>()), fetchMonth }));
vi.mock("@/lib/db", () => ({ todos: { monthCounts }, nativeEvents: { month: nativeMonth } }));

import { GET } from "@/app/api/month/route";

const day = (date: string, over: Partial<DayData> = {}): DayData => ({ date, done: 0, total: 0, events: 0, tasks: [], eventList: [], ...over });
const call = () => GET(new Request("http://x/api/month?ym=2026-10"));
const todoRows = [{ date: "2026-10-01", done: true }, { date: "2026-10-01", done: false }, { date: "2026-10-05", done: true }];

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me", accessToken: "jwt" });
  resolveGoogleAccess.mockResolvedValue({ status: "ok", accessToken: "db-token" });
  fetchMonth.mockResolvedValue({
    "2026-10-01": day("2026-10-01", { done: 1, total: 1, tasks: [{ title: "g", done: true }] }),
    "2026-10-05": day("2026-10-05"),
  });
  monthCounts.mockResolvedValue(todoRows);
  nativeMonth.mockResolvedValue([]);
});

describe("GET /api/month with own todos", () => {
  it("adds own todo counts to done/total and keeps the Google tasks list as it is", async () => {
    const res = await call();
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=30, stale-while-revalidate=300");
    const body = await res.json();
    expect(body.days["2026-10-01"]).toMatchObject({ done: 2, total: 3, tasks: [{ title: "g", done: true }] });
    expect(body.days["2026-10-05"]).toMatchObject({ done: 1, total: 1, tasks: [] });
    expect(monthCounts).toHaveBeenCalledTimes(1);
    expect(monthCounts).toHaveBeenCalledWith("me", "2026-10");
  });
  it("still adds them when Google is none/revoked (skeleton days, Google never called)", async () => {
    for (const status of ["none", "revoked"]) {
      resolveGoogleAccess.mockResolvedValue({ status });
      const res = await call();
      const body = await res.json();
      expect(body.google).toBe(status);
      expect(Object.keys(body.days)).toHaveLength(31);
      expect(body.days["2026-10-01"]).toMatchObject({ done: 1, total: 2, tasks: [] });
      expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    }
    expect(fetchMonth).not.toHaveBeenCalled();
  });
  it("401 first: nothing is queried when signed out", async () => {
    getUser.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    expect(monthCounts).not.toHaveBeenCalled();
  });
  it("a failing todo query degrades to Google-only data (200) with one fixed warning and no values", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    monthCounts.mockRejectedValue(new Error("db down: secret detail"));
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store"); // incomplete answer must not be cached
    expect((await res.json()).days["2026-10-01"]).toMatchObject({ done: 1, total: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toEqual(["month: own todos unavailable, showing Google data only"]);
    warn.mockRestore();
  });
  it("a Google failure is still a 502 and does not hide behind the todo path", async () => {
    fetchMonth.mockRejectedValue(new Error("Google API 500"));
    expect((await call()).status).toBe(502);
  });
});

describe("GET /api/month with own calendar events", () => {
  const rows = [{ id: 1, date: "2026-10-05", startMin: 600, endMin: 660, title: "own standup" }];
  it("adds them to the day event count and list, in time order", async () => {
    fetchMonth.mockResolvedValue({ "2026-10-05": day("2026-10-05", { events: 1, eventList: [{ title: "g", time: "14:00" }] }) });
    nativeMonth.mockResolvedValue(rows);
    const res = await call();
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=30, stale-while-revalidate=300");
    const body = await res.json();
    expect(body.days["2026-10-05"]).toMatchObject({ events: 2, eventList: [{ title: "own standup", time: "10:00" }, { title: "g", time: "14:00" }] });
    expect(nativeMonth).toHaveBeenCalledWith("me", "2026-10");
  });
  it("still adds them when Google is none/revoked", async () => {
    resolveGoogleAccess.mockResolvedValue({ status: "none" });
    nativeMonth.mockResolvedValue(rows);
    const body = await (await call()).json();
    expect(body.google).toBe("none");
    expect(body.days["2026-10-05"]).toMatchObject({ events: 1, eventList: [{ title: "own standup", time: "10:00" }] });
  });
  it("a failing own-events query degrades to the Google data, uncached, with a fixed warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    nativeMonth.mockRejectedValue(new Error("secret title leaked in message"));
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(warn).toHaveBeenCalledWith("month: own events unavailable, showing Google data only");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret");
    warn.mockRestore();
  });
});
