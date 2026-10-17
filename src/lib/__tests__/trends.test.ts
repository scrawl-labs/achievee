import { describe, expect, it } from "vitest";
import { moneyTrend, periodsBack, trendAverages } from "@/lib/moneyTrend";
import { weeksBack, workoutTrend } from "@/lib/workoutTrend";
import type { WorkoutRow } from "@/lib/workout";

describe("periodsBack", () => {
  it("lists the periods ending with the one that holds the date, oldest first", () => {
    expect(periodsBack("2026-10-14", 1, 3)).toEqual([
      { from: "2026-08-01", to: "2026-09-01" }, { from: "2026-09-01", to: "2026-10-01" }, { from: "2026-10-01", to: "2026-11-01" },
    ]);
  });
  it("follows a custom start day, across the new year, with no gaps or overlaps", () => {
    const p = periodsBack("2026-01-10", 25, 3);
    expect(p).toEqual([
      { from: "2025-10-25", to: "2025-11-25" }, { from: "2025-11-25", to: "2025-12-25" }, { from: "2025-12-25", to: "2026-01-25" },
    ]);
    for (let i = 1; i < p.length; i++) expect(p[i].from).toBe(p[i - 1].to);
  });
  it("a date after the start day belongs to the period that started this month", () => {
    expect(periodsBack("2026-10-30", 25, 1)).toEqual([{ from: "2026-10-25", to: "2026-11-25" }]);
  });
});

describe("moneyTrend", () => {
  const ranges = [{ from: "2026-09-01", to: "2026-10-01" }, { from: "2026-10-01", to: "2026-11-01" }];
  const rows = {
    expenses: [
      { date: "2026-09-05", category: "fixed", amount: 700000, need: 1 },
      { date: "2026-09-07", category: "shopping", amount: 100000, need: 0 },
      { date: "2026-09-08", category: "food", amount: 100000, need: 1 },
      { date: "2026-10-01", category: "food", amount: 50000, need: true },
      { date: "2026-11-01", category: "food", amount: 999, need: 1 },      // next period, ignored
    ],
    income: [{ date: "2026-09-25", amount: 3000000 }],
    savings: [{ date: "2026-09-30", amount: 600000 }, { date: "2026-10-02", amount: 200000 }],
  };
  it("keeps fixed costs apart from spending you can change and never counts savings as spending", () => {
    const [sep, oct] = moneyTrend(rows, ranges);
    expect(sep).toMatchObject({ income: 3000000, fixed: 700000, variable: 200000, waste: 100000, saved: 600000 });
    expect(sep.savingRate).toBeCloseTo(0.2);
    expect(sep.wasteRatio).toBeCloseTo(0.5);
    expect(oct).toMatchObject({ income: 0, fixed: 0, variable: 50000, waste: 0, saved: 200000 });
  });
  it("has no rate when nothing came in or nothing was spent", () => {
    const [, oct] = moneyTrend(rows, ranges);
    expect(oct.savingRate).toBeNull();
    expect(moneyTrend({ expenses: [], income: [], savings: [] }, ranges)[0]).toMatchObject({ savingRate: null, wasteRatio: null, variable: 0 });
  });
  it("averages only over the periods that have something to average", () => {
    expect(trendAverages(moneyTrend(rows, ranges))).toEqual({ savingRate: expect.closeTo(0.2), variable: 125000 });
    expect(trendAverages(moneyTrend({ expenses: [], income: [], savings: [] }, ranges))).toEqual({ savingRate: null, variable: null });
  });
  it("reads the legacy Korean category label for fixed costs as other, not fixed", () => {
    const [p] = moneyTrend({ expenses: [{ date: "2026-09-02", category: "기타", amount: 10, need: 1 }], income: [], savings: [] }, ranges);
    expect(p).toMatchObject({ fixed: 0, variable: 10 });
  });
});

const wo = (date: string, kind: WorkoutRow["kind"], minutes: number, id = 1): WorkoutRow => ({ id, date, kind, minutes, memo: "" });

describe("weeksBack / workoutTrend", () => {
  it("lists Mondays ending with the week of the date, oldest first", () => {
    expect(weeksBack("2026-10-14", 3)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(weeksBack("2026-10-18", 1)).toEqual(["2026-10-12"]); // a Sunday still belongs to the week that started on Monday
  });
  it("counts sessions and minutes per week against the goal and finds the most frequent kind", () => {
    const rows = [
      wo("2026-10-12", "run", 40, 1), wo("2026-10-13", "run", 50, 2), wo("2026-10-15", "gym", 60, 3),
      wo("2026-10-06", "gym", 30, 4), wo("2026-09-01", "yoga", 99, 5),   // the last one is outside the window
    ];
    const t = workoutTrend(rows, "2026-10-14", 3, 3);
    expect(t.weeks.map((w) => [w.week, w.sessions, w.minutes, w.met])).toEqual([
      ["2026-09-28", 0, 0, false], ["2026-10-05", 1, 30, false], ["2026-10-12", 3, 150, true],
    ]);
    expect(t.metWeeks).toBe(1);
    expect(t.avgSessions).toBeCloseTo(4 / 3);
    expect(t.avgMinutes).toBe(45);            // 180 minutes over 4 sessions
    expect(t.topKind).toBe("run");
    expect(t.max).toBe(3);
  });
  it("copes with no sessions at all", () => {
    const t = workoutTrend([], "2026-10-14", 4, 3);
    expect(t).toMatchObject({ metWeeks: 0, avgSessions: 0, avgMinutes: 0, topKind: null, max: 3 });
    expect(t.weeks).toHaveLength(4);
  });
  it("the bar scale grows past the goal when a week beats it", () => {
    expect(workoutTrend([wo("2026-10-12", "run", 10, 1), wo("2026-10-13", "run", 10, 2), wo("2026-10-14", "run", 10, 3), wo("2026-10-15", "run", 10, 4), wo("2026-10-16", "run", 10, 5)], "2026-10-14", 2, 3).max).toBe(5);
  });
});
