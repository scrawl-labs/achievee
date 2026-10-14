import { describe, expect, it } from "vitest";
import { mergeEvents } from "@/lib/calendarSources";
import {
  mergeNativeIntoMonth, nativeIdOf, parseNativeCreate, parseNativeId, parseNativePatch, toDayEvent, type NativeEventRow,
} from "@/lib/nativeEvents";
import type { DayData, DayEvent } from "@/lib/types";

const create = { date: "2026-10-14", startMin: 600, endMin: 660, title: "Planning" };
const day = (date: string, over: Partial<DayData> = {}): DayData => ({ date, done: 0, total: 0, events: 0, tasks: [], eventList: [], ...over });

describe("parseNativeCreate", () => {
  it("accepts a valid event and trims the title", () => {
    expect(parseNativeCreate({ ...create, title: "  Planning  " })).toEqual({ ok: true, value: create });
  });
  it.each([
    ["not an object", null], ["missing title", { ...create, title: undefined }], ["blank title", { ...create, title: "   " }],
    ["title too long", { ...create, title: "x".repeat(201) }], ["bad date", { ...create, date: "2026-13-01" }],
    ["end before start", { ...create, startMin: 700, endMin: 600 }], ["too short", { ...create, startMin: 600, endMin: 610 }],
    ["past midnight", { ...create, startMin: 1400, endMin: 1500 }], ["fractional minute", { ...create, startMin: 600.5 }],
    ["string minute", { ...create, startMin: "600" }], ["negative", { ...create, startMin: -15 }],
  ])("rejects %s", (_name, body) => { expect(parseNativeCreate(body).ok).toBe(false); });
  it("allows an event that ends exactly at midnight", () => {
    expect(parseNativeCreate({ ...create, startMin: 1380, endMin: 1440 }).ok).toBe(true);
  });
});

describe("parseNativePatch", () => {
  it("accepts a title-only, a date-only and a time change", () => {
    expect(parseNativePatch({ id: 3, title: "New" })).toEqual({ ok: true, value: { id: 3, title: "New" } });
    expect(parseNativePatch({ id: 3, date: "2026-10-15" })).toEqual({ ok: true, value: { id: 3, date: "2026-10-15" } });
    expect(parseNativePatch({ id: 3, startMin: 540, endMin: 600 })).toEqual({ ok: true, value: { id: 3, startMin: 540, endMin: 600 } });
  });
  it("rejects a time change that carries only one end, nothing to update, and a bad id", () => {
    expect(parseNativePatch({ id: 3, startMin: 540 }).ok).toBe(false);
    expect(parseNativePatch({ id: 3, endMin: 600 }).ok).toBe(false);
    expect(parseNativePatch({ id: 3 }).ok).toBe(false);
    expect(parseNativePatch({ title: "x" }).ok).toBe(false);
    expect(parseNativePatch({ id: 0, title: "x" }).ok).toBe(false);
    expect(parseNativePatch({ id: 3, title: "" }).ok).toBe(false);
  });
});

describe("parseNativeId", () => {
  it("takes digits only", () => {
    expect(parseNativeId("12")).toEqual({ ok: true, value: 12 });
    for (const bad of [null, "", "0", "-1", "1.5", "abc", "99999999999"]) expect(parseNativeId(bad).ok).toBe(false);
  });
});

describe("toDayEvent / nativeIdOf", () => {
  const row: NativeEventRow = { id: 12, date: "2026-10-14", startMin: 600, endMin: 660, title: "Planning" };
  it("draws like any other event, marked native, with an id that cannot clash with Google ids", () => {
    expect(toDayEvent(row)).toMatchObject({ id: "n12", source: "native", allDay: false, startMin: 600, endMin: 660, title: "Planning", calendar: "Achievee" });
    expect(toDayEvent(row).link).toBeUndefined();
  });
  it("gives back the numeric id for own events only", () => {
    expect(nativeIdOf(toDayEvent(row))).toBe(12);
    expect(nativeIdOf({ id: "n12", source: "google" })).toBeNull();
    expect(nativeIdOf({ id: "abc123", source: undefined })).toBeNull();
  });
  it("mixes with Google events in time order without merging either away", () => {
    const g: DayEvent = { id: "g1", date: "2026-10-14", title: "Standup", calendar: "Work", color: "#fff", allDay: false, startMin: 540, endMin: 570 };
    expect(mergeEvents([g], [toDayEvent(row)]).map((e) => e.id)).toEqual(["g1", "n12"]);
  });
});

describe("mergeNativeIntoMonth", () => {
  const rows: NativeEventRow[] = [
    { id: 1, date: "2026-10-05", startMin: 600, endMin: 660, title: "own a" },
    { id: 2, date: "2026-10-05", startMin: 480, endMin: 510, title: "own b" },
    { id: 3, date: "2026-11-01", startMin: 600, endMin: 660, title: "outside the month" },
  ];
  it("adds to the count and list in time order, ignores other months, never touches the input", () => {
    const days = { "2026-10-05": day("2026-10-05", { events: 1, eventList: [{ title: "g", time: "09:00" }] }), "2026-10-06": day("2026-10-06") };
    const before = JSON.stringify(days);
    const out = mergeNativeIntoMonth(days, rows);
    expect(out["2026-10-05"].events).toBe(3);
    expect(out["2026-10-05"].eventList.map((e) => e.title)).toEqual(["own b", "g", "own a"]);
    expect(out["2026-10-06"]).toEqual(days["2026-10-06"]);
    expect(Object.keys(out)).toEqual(["2026-10-05", "2026-10-06"]);
    expect(JSON.stringify(days)).toBe(before);
  });
  it("keeps all-day Google entries (no time) first", () => {
    const days = { "2026-10-05": day("2026-10-05", { events: 1, eventList: [{ title: "trip", time: null }] }) };
    expect(mergeNativeIntoMonth(days, rows)["2026-10-05"].eventList[0].title).toBe("trip");
  });
});
