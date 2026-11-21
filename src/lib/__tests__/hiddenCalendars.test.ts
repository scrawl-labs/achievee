import { beforeEach, describe, expect, it, vi } from "vitest";
import { HIDDEN_CALENDARS_MAX, parseHiddenCalendars, shownCalendars } from "@/lib/calendarSources";

const { getUser, resolveGoogleAccess, fetchCalendars, fetchRange, hiddenCalendars, setHiddenCalendars, range } = vi.hoisted(() => ({
  getUser: vi.fn(), resolveGoogleAccess: vi.fn(), fetchCalendars: vi.fn(), fetchRange: vi.fn(),
  hiddenCalendars: vi.fn(), setHiddenCalendars: vi.fn(), range: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/googleToken", async (orig) => ({ ...(await orig<typeof import("@/lib/googleToken")>()), resolveGoogleAccess }));
vi.mock("@/lib/google", async (orig) => ({ ...(await orig<typeof import("@/lib/google")>()), fetchCalendars, fetchRange }));
vi.mock("@/lib/db", () => ({ settings: { hiddenCalendars, setHiddenCalendars }, nativeEvents: { range } }));

import { GET as calendars } from "@/app/api/integrations/google/calendars/route";
import { PUT as putSettings } from "@/app/api/settings/route";
import { GET as events } from "@/app/api/events/route";

const put = (body: unknown) => putSettings(new Request("http://x/api/settings", { method: "PUT", body: JSON.stringify(body) }));
const list = [{ id: "me@x.com", name: "Me", color: "#111" }, { id: "holidays", name: "Holidays", color: "#222" }];

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me", accessToken: "jwt" });
  resolveGoogleAccess.mockResolvedValue({ status: "ok", accessToken: "db-token" });
  fetchCalendars.mockResolvedValue(list);
  fetchRange.mockResolvedValue([]);
  hiddenCalendars.mockResolvedValue(["holidays"]);
  range.mockResolvedValue([]);
});

describe("shownCalendars / parseHiddenCalendars", () => {
  it("drops hidden calendars and keeps the order", () => {
    expect(shownCalendars(list, ["holidays"]).map((c) => c.id)).toEqual(["me@x.com"]);
    expect(shownCalendars(list, [])).toEqual(list);
    expect(shownCalendars(list, [])).not.toBe(list);
  });
  it("accepts an array of ids (deduplicated), nothing else", () => {
    expect(parseHiddenCalendars([])).toEqual([]);
    expect(parseHiddenCalendars(["a", "b", "a"])).toEqual(["a", "b"]);
    for (const bad of [null, "a", [1], [""], ["x".repeat(513)], Array(HIDDEN_CALENDARS_MAX + 1).fill("a"), { a: 1 }]) expect(parseHiddenCalendars(bad)).toBeNull();
  });
});

describe("GET /api/integrations/google/calendars", () => {
  it("lists the Google calendars with the hidden ones, never cached", async () => {
    const res = await calendars();
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ status: "ok", calendars: list, hidden: ["holidays"] });
    expect(fetchCalendars).toHaveBeenCalledWith("db-token");
  });
  it("not connected: an empty list and the status, without calling Google", async () => {
    resolveGoogleAccess.mockResolvedValue({ status: "none" });
    expect(await (await calendars()).json()).toEqual({ status: "none", calendars: [], hidden: ["holidays"] });
    expect(fetchCalendars).not.toHaveBeenCalled();
  });
  it("a Google failure is a 502 with a fixed message", async () => {
    fetchCalendars.mockRejectedValue(new Error("Google API 500: secret"));
    const res = await calendars();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
  it("is unauthorized without a user", async () => {
    getUser.mockResolvedValue(null);
    expect((await calendars()).status).toBe(401);
    expect(hiddenCalendars).not.toHaveBeenCalled();
  });
});

describe("PUT /api/settings hiddenCalendars", () => {
  it("stores the whole list", async () => {
    expect((await put({ hiddenCalendars: ["holidays", "holidays", "team@x.com"] })).status).toBe(200);
    expect(setHiddenCalendars).toHaveBeenCalledWith("me", ["holidays", "team@x.com"]);
  });
  it("rejects anything but a list of ids, and needs a user", async () => {
    expect((await put({ hiddenCalendars: "holidays" })).status).toBe(400);
    getUser.mockResolvedValue(null);
    expect((await put({ hiddenCalendars: [] })).status).toBe(401);
    expect(setHiddenCalendars).not.toHaveBeenCalled();
  });
});

describe("GET /api/events with hidden calendars", () => {
  const call = () => events(new Request("http://x/api/events?from=2026-11-21&to=2026-12-05&tz=Asia/Seoul"));
  it("passes the hidden calendars to Google's fetch", async () => {
    await call();
    expect(fetchRange).toHaveBeenCalledWith("2026-11-21", "2026-12-05", "db-token", "Asia/Seoul", ["holidays"]);
  });
  it("an unreadable setting shows every calendar, with a fixed warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    hiddenCalendars.mockRejectedValue(new Error("db down: me@x.com"));
    expect((await call()).status).toBe(200);
    expect(fetchRange).toHaveBeenCalledWith("2026-11-21", "2026-12-05", "db-token", "Asia/Seoul", []);
    expect(warn).toHaveBeenCalledWith("events: calendar choice unavailable, showing every calendar");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("me@x.com");
    warn.mockRestore();
  });
});
