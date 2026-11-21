import { describe, expect, it } from "vitest";
import type { DayEvent } from "@/lib/types";
import { daysUntil, ddayLabel, eventKey, selectUpcoming } from "@/lib/upcoming";

const TODAY = "2026-11-21";
const g = (id: string, date: string, startMin: number, over: Partial<DayEvent> = {}): DayEvent => ({
  id: `work@x.com:${id}:${date}`, date, title: id, calendar: "Work", color: "#8fb8ff", allDay: false, startMin, endMin: startMin + 60, ...over,
});
const own = (n: number, date: string, startMin: number): DayEvent => ({
  id: `n${n}`, date, title: `own${n}`, calendar: "Achievee", color: "#7c8cff", allDay: false, startMin, endMin: startMin + 60, source: "native",
});
const titles = (rows: DayEvent[]) => rows.map((e) => e.title);

describe("daysUntil / ddayLabel", () => {
  it("counts whole calendar days, across a month end", () => {
    expect(daysUntil("2026-11-21", TODAY)).toBe(0);
    expect(daysUntil("2026-12-01", TODAY)).toBe(10);
  });
  it("Today, Tomorrow, then D-n", () => {
    expect(ddayLabel(TODAY, TODAY)).toEqual({ key: "up.today" });
    expect(ddayLabel("2026-11-22", TODAY)).toEqual({ key: "up.tomorrow" });
    expect(ddayLabel("2026-11-29", TODAY)).toEqual({ key: "up.dday", n: 8 });
  });
});

describe("eventKey", () => {
  it("joins the per-day segments of one Google event, keeps own ids", () => {
    expect(eventKey(g("trip", "2026-11-23", 0))).toBe(eventKey(g("trip", "2026-11-24", 0)));
    expect(eventKey(g("trip", "2026-11-23", 0))).not.toBe(eventKey(g("other", "2026-11-23", 0)));
    expect(eventKey(own(3, "2026-11-23", 0))).toBe("n3");
  });
});

describe("selectUpcoming", () => {
  it("lists everything in time order when it fits: day, all-day first, then start", () => {
    const up = selectUpcoming([g("late", "2026-11-22", 900), own(1, "2026-11-22", 600), g("holiday", "2026-11-22", 0, { allDay: true, endMin: 1440 }), g("first", TODAY, 1200)], TODAY, 600);
    expect(titles(up.rows)).toEqual(["first", "holiday", "own1", "late"]);
    expect(up).toMatchObject({ more: 0, google: 0 });
  });

  it("drops what already ended today and what is past the window", () => {
    const up = selectUpcoming([g("ended", TODAY, 480), g("now", TODAY, 570), g("in14", "2026-12-05", 600), g("in13", "2026-12-04", 600), g("past", "2026-11-20", 600)], TODAY, 600);
    expect(titles(up.rows)).toEqual(["now", "in13"]); // 09:30-10:30 is still on at 10:00
  });

  it("a multi-day event is one row, on its first day in range", () => {
    const trip = ["2026-11-23", "2026-11-24", "2026-11-25"].map((d) => g("trip", d, 0, { allDay: true, endMin: 1440 }));
    const up = selectUpcoming(trip, TODAY, 0);
    expect(up.rows).toHaveLength(1);
    expect(up.rows[0].date).toBe("2026-11-23");
  });

  it("too many: own plans are listed, Google events become a count", () => {
    const meetings = Array.from({ length: 8 }, (_, i) => g(`m${i}`, "2026-11-24", 540 + i * 60));
    const up = selectUpcoming([...meetings, own(1, "2026-11-28", 420)], TODAY, 0);
    expect(titles(up.rows)).toEqual(["own1"]);
    expect(up).toMatchObject({ more: 0, google: 8 });
  });

  it("caps own plans too, with the rest as a count", () => {
    const mine = Array.from({ length: 7 }, (_, i) => own(i, "2026-11-25", 480 + i * 60));
    const up = selectUpcoming([...mine, g("m", "2026-11-22", 600)], TODAY, 0);
    expect(titles(up.rows)).toEqual(["own0", "own1", "own2", "own3", "own4"]);
    expect(up).toMatchObject({ more: 2, google: 1 });
  });

  it("no own events at all: the nearest Google ones instead of an empty strip", () => {
    const meetings = Array.from({ length: 7 }, (_, i) => g(`m${i}`, "2026-11-24", 540 + i * 60));
    const up = selectUpcoming(meetings, TODAY, 0);
    expect(titles(up.rows)).toEqual(["m0", "m1", "m2", "m3", "m4"]);
    expect(up).toMatchObject({ more: 2, google: 0 });
  });

  it("never modifies its input", () => {
    const list = [g("b", "2026-11-23", 600), g("a", "2026-11-22", 600)];
    selectUpcoming(list, TODAY, 0);
    expect(titles(list)).toEqual(["b", "a"]);
  });
});
