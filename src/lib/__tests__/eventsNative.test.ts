import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DayEvent } from "@/lib/types";

const { getUser, resolveGoogleAccess, fetchRange, range } = vi.hoisted(() => ({
  getUser: vi.fn(), resolveGoogleAccess: vi.fn(), fetchRange: vi.fn(), range: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/googleToken", async (orig) => ({ ...(await orig<typeof import("@/lib/googleToken")>()), resolveGoogleAccess }));
vi.mock("@/lib/google", async (orig) => ({ ...(await orig<typeof import("@/lib/google")>()), fetchRange }));
vi.mock("@/lib/db", () => ({ nativeEvents: { range } }));

import { GET } from "@/app/api/events/route";

const ev = (id: string, startMin: number, over: Partial<DayEvent> = {}): DayEvent => ({
  id, date: "2026-10-14", title: id, calendar: "Work", color: "#fff", allDay: false, startMin, endMin: startMin + 30, ...over,
});
const call = () => GET(new Request("http://x/api/events?from=2026-10-14&to=2026-10-15&tz=Asia/Seoul"));
const ownRow = { id: 7, date: "2026-10-14", startMin: 600, endMin: 660, title: "own planning" };

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me" });
  resolveGoogleAccess.mockResolvedValue({ status: "ok", accessToken: "db-token" });
  fetchRange.mockResolvedValue([ev("g-early", 540), ev("g-late", 780)]);
  range.mockResolvedValue([ownRow]);
});

describe("GET /api/events with own events", () => {
  it("mixes own events into the Google ones in time order and marks them native", async () => {
    const res = await call();
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=30, stale-while-revalidate=300");
    const body = (await res.json()) as DayEvent[];
    expect(body.map((e) => e.id)).toEqual(["g-early", "n7", "g-late"]);
    expect(body[1]).toMatchObject({ source: "native", title: "own planning", startMin: 600, endMin: 660, allDay: false });
    expect(range).toHaveBeenCalledWith("me", "2026-10-14", "2026-10-15");
  });

  it("still returns the own events when Google is not connected (status travels in the header)", async () => {
    for (const status of ["none", "revoked"]) {
      resolveGoogleAccess.mockResolvedValue({ status });
      const res = await call();
      expect(res.headers.get("X-Google-Status")).toBe(status);
      expect(((await res.json()) as DayEvent[]).map((e) => e.id)).toEqual(["n7"]);
    }
    expect(fetchRange).not.toHaveBeenCalled();
  });

  it("a failing own-events query degrades to Google only, uncached, with a fixed warning and no values", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    range.mockRejectedValue(new Error("secret title leaked in message"));
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(((await res.json()) as DayEvent[]).map((e) => e.id)).toEqual(["g-early", "g-late"]);
    expect(warn).toHaveBeenCalledWith("events: own events unavailable, showing Google events only");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret");
    warn.mockRestore();
  });

  it("is still unauthorized without a user and never reads anything", async () => {
    getUser.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    expect(range).not.toHaveBeenCalled();
  });
});
