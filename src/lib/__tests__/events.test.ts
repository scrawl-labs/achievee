import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMonth, fetchRange, isActiveEvent } from "@/lib/google";
import { calendarEvents, calendarList, emptyTasks, stubGoogle } from "./mockGoogle";

const TZ = "Asia/Seoul";
afterEach(() => vi.unstubAllGlobals());

describe("isActiveEvent", () => {
  it("accepts a normal event", () => {
    expect(isActiveEvent({ status: "confirmed" })).toBe(true);
    expect(isActiveEvent({})).toBe(true);
  });
  it("rejects cancelled events", () => {
    expect(isActiveEvent({ status: "cancelled" })).toBe(false);
  });
  it("rejects events I declined, but not others' declines", () => {
    expect(isActiveEvent({ attendees: [{ self: true, responseStatus: "declined" }] })).toBe(false);
    expect(isActiveEvent({ attendees: [{ responseStatus: "declined" }, { self: true, responseStatus: "accepted" }] })).toBe(true);
  });
});

const cals = [
  { id: "primary", summary: "Me", selected: true },
  { id: "team@x.com", summary: "Team", selected: true },
  { id: "hidden@x.com", summary: "Hidden" }, // `selected` absent = unchecked
  { id: "off@x.com", summary: "Off", selected: false },
];
const timed = (id: string, summary: string, s: string, e: string, extra: object = {}) =>
  ({ id, summary, start: { dateTime: s }, end: { dateTime: e }, ...extra });

function stubCalendar() {
  return stubGoogle([
    ...emptyTasks,
    calendarList(cals),
    calendarEvents("primary", [
      timed("a", "Standup", "2026-03-05T10:00:00+09:00", "2026-03-05T10:30:00+09:00"),
      timed("b", "Cancelled", "2026-03-05T11:00:00+09:00", "2026-03-05T12:00:00+09:00", { status: "cancelled" }),
      timed("c", "Declined", "2026-03-05T13:00:00+09:00", "2026-03-05T14:00:00+09:00",
        { attendees: [{ self: true, responseStatus: "declined" }] }),
    ]),
    calendarEvents("team@x.com", [timed("d", "Team sync", "2026-03-06T09:00:00+09:00", "2026-03-06T10:00:00+09:00")]),
    calendarEvents("hidden@x.com", [timed("e", "Secret", "2026-03-07T09:00:00+09:00", "2026-03-07T10:00:00+09:00")]),
    calendarEvents("off@x.com", [timed("f", "Off", "2026-03-08T09:00:00+09:00", "2026-03-08T10:00:00+09:00")]),
  ]);
}

describe("fetchRange filtering", () => {
  it("drops cancelled/declined events and unchecked calendars", async () => {
    stubCalendar();
    const out = await fetchRange("2026-03-01", "2026-04-01", "tok", TZ);
    expect(out.map((e) => e.title)).toEqual(["Standup", "Team sync"]);
  });
});

describe("fetchMonth vs fetchRange consistency", () => {
  it("shows exactly the events the range views show", async () => {
    stubCalendar();
    const month = await fetchMonth("2026-03", "tok", TZ);
    const range = await fetchRange("2026-03-01", "2026-04-01", "tok", TZ);
    const fromMonth = Object.values(month).flatMap((d) => d.eventList.map((e) => `${d.date}|${e.title}`)).sort();
    const fromRange = range.map((e) => `${e.date}|${e.title}`).sort();
    expect(fromMonth).toEqual(fromRange);
    expect(month["2026-03-05"].events).toBe(1);
    expect(month["2026-03-07"].events).toBe(0);
  });

  it("uses HH:mm local time for timed events and null for all-day", async () => {
    stubGoogle([
      ...emptyTasks,
      calendarList([{ id: "primary", summary: "Me", selected: true }]),
      calendarEvents("primary", [
        timed("a", "Lunch", "2026-03-05T12:30:00+09:00", "2026-03-05T13:30:00+09:00"),
        { id: "b", summary: "Holiday", start: { date: "2026-03-05" }, end: { date: "2026-03-06" } },
      ]),
    ]);
    const list = (await fetchMonth("2026-03", "tok", TZ))["2026-03-05"].eventList;
    expect(list).toEqual([{ title: "Holiday", time: null }, { title: "Lunch", time: "12:30" }]);
  });

  it("covers a 31-day month fully, including the last day", async () => {
    stubGoogle([
      ...emptyTasks,
      calendarList([{ id: "primary", summary: "Me", selected: true }]),
      calendarEvents("primary", [timed("a", "Last", "2026-03-31T22:00:00+09:00", "2026-03-31T23:00:00+09:00")]),
    ]);
    const month = await fetchMonth("2026-03", "tok", TZ);
    expect(Object.keys(month)).toHaveLength(31);
    expect(month["2026-03-31"].events).toBe(1);
  });
});

describe("timezone boundaries", () => {
  it("splits an event across local midnight (KST)", async () => {
    stubGoogle([
      ...emptyTasks,
      calendarList([{ id: "primary", summary: "Me", selected: true }]),
      calendarEvents("primary", [timed("a", "Late", "2026-03-05T23:30:00+09:00", "2026-03-06T00:30:00+09:00")]),
    ]);
    const out = await fetchRange("2026-03-05", "2026-03-07", "tok", TZ);
    expect(out.map((e) => [e.date, e.startMin, e.endMin])).toEqual([
      ["2026-03-05", 1410, 1440],
      ["2026-03-06", 0, 30],
    ]);
  });

  it("assigns by the viewer's timezone, not UTC", async () => {
    // 2026-03-05T16:00Z is 03-06 01:00 in Seoul but 03-05 08:00 in Los Angeles
    const ev = timed("a", "Edge", "2026-03-05T16:00:00Z", "2026-03-05T17:00:00Z");
    const routes = [
      ...emptyTasks,
      calendarList([{ id: "primary", summary: "Me", selected: true }]),
      calendarEvents("primary", [ev]),
    ];
    stubGoogle(routes);
    const seoul = await fetchMonth("2026-03", "tok", "Asia/Seoul");
    expect(seoul["2026-03-06"].eventList).toEqual([{ title: "Edge", time: "01:00" }]);
    expect(seoul["2026-03-05"].events).toBe(0);
    const la = await fetchMonth("2026-03", "tok", "America/Los_Angeles");
    expect(la["2026-03-05"].eventList).toEqual([{ title: "Edge", time: "08:00" }]);
  });

  it("spreads a multi-day all-day event over each day, end exclusive", async () => {
    stubGoogle([
      ...emptyTasks,
      calendarList([{ id: "primary", summary: "Me", selected: true }]),
      calendarEvents("primary", [{ id: "t", summary: "Trip", start: { date: "2026-03-05" }, end: { date: "2026-03-08" } }]),
    ]);
    const month = await fetchMonth("2026-03", "tok", TZ);
    const days = Object.values(month).filter((d) => d.events > 0).map((d) => d.date);
    expect(days).toEqual(["2026-03-05", "2026-03-06", "2026-03-07"]);
    expect(month["2026-03-05"].eventList).toEqual([{ title: "Trip", time: null }]);
  });
});
