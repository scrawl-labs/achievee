import { describe, expect, it } from "vitest";
import { eventSource, mergeEvents } from "@/lib/calendarSources";
import type { DayEvent } from "@/lib/types";

const ev = (o: Partial<DayEvent> & { id: string }): DayEvent => ({
  date: "2026-10-14", title: "t", calendar: "c", color: "#fff", allDay: false, startMin: 600, endMin: 660, ...o,
});

describe("eventSource", () => {
  it("treats a missing source as google (data from before the field existed)", () => {
    expect(eventSource(ev({ id: "a" }))).toBe("google");
  });
  it("returns the explicit source", () => {
    expect(eventSource(ev({ id: "a", source: "native" }))).toBe("native");
    expect(eventSource(ev({ id: "b", source: "google" }))).toBe("google");
  });
});

describe("mergeEvents", () => {
  it("returns an empty list for nothing", () => {
    expect(mergeEvents()).toEqual([]);
    expect(mergeEvents([], [])).toEqual([]);
  });
  it("sorts by date, then start, then longer-first (the order the Google endpoint already uses)", () => {
    const a = ev({ id: "a", date: "2026-10-15", startMin: 0 });
    const b = ev({ id: "b", startMin: 700, endMin: 720 });
    const c = ev({ id: "c", startMin: 600, endMin: 630 });
    const d = ev({ id: "d", startMin: 600, endMin: 700 });
    expect(mergeEvents([a, b], [c, d]).map((e) => e.id)).toEqual(["d", "c", "b", "a"]);
  });
  it("keeps input order for full ties (stable)", () => {
    const x = ev({ id: "x" }), y = ev({ id: "y" });
    expect(mergeEvents([x, y]).map((e) => e.id)).toEqual(["x", "y"]);
  });
  it("drops duplicate ids, first one wins", () => {
    const first = ev({ id: "same", title: "first" });
    const second = ev({ id: "same", title: "second", source: "native" });
    const out = mergeEvents([first], [second]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("first");
  });
  it("does not mutate its inputs and returns a new array", () => {
    const l1 = [ev({ id: "b", startMin: 900 }), ev({ id: "a", startMin: 100 })];
    const snapshot = [...l1];
    const out = mergeEvents(l1);
    expect(l1).toEqual(snapshot);
    expect(out).not.toBe(l1);
    expect(out.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
