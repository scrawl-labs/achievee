import { describe, expect, it } from "vitest";
import { budgetLine, countable, crossed, levelOf, parseBudget, weekFromMonth, weekOf } from "@/lib/budget";

const r = (date: string, amount: number, category = "food") => ({ date, amount, category });

describe("budget", () => {
  it("leaves fixed costs out and keeps to the range", () => {
    expect(countable([r("2026-11-26", 10000), r("2026-11-27", 500000, "fixed"), r("2026-11-30", 3000), r("2026-12-26", 9)], "2026-11-26", "2026-12-26")).toBe(13000);
  });
  it("is near from 80% and over only past the goal", () => {
    expect([levelOf(79, 100), levelOf(80, 100), levelOf(100, 100), levelOf(101, 100)]).toEqual(["ok", "near", "near", "over"]);
  });
  it("the month goal counts from the start day; before it there is nothing to show", () => {
    const rows = [r("2026-11-24", 50000), r("2026-11-26", 200000)];
    expect(budgetLine(rows, 810000, "2026-10-26", "2026-11-26", "2026-11-26", false)).toBeNull();
    const m = budgetLine(rows, 810000, "2026-11-26", "2026-12-26", "2026-11-26", false)!;
    expect([m.limit, m.spent, m.left, m.level, m.partial]).toEqual([810000, 200000, 610000, "ok", false]);
  });
  it("a week the start day cuts into gets the share of the goal for the days left", () => {
    const rows = [r("2026-11-24", 50000), r("2026-11-27", 100000)];
    const w = budgetLine(rows, 189000, "2026-11-23", "2026-11-30", "2026-11-26", true)!; // Thursday to Sunday: 4 days
    expect([w.limit, w.spent, w.since, w.partial, w.level]).toEqual([108000, 100000, "2026-11-26", true, "near"]);
  });
  it("no goal, no line", () => {
    expect(budgetLine([r("2026-11-27", 1)], 0, "2026-11-23", "2026-11-30", "", true)).toBeNull();
  });
  it("says so once when an expense crosses into near or over", () => {
    expect(crossed(100000, 60000, 189000)).toBe("near");
    expect(crossed(160000, 5000, 189000)).toBeNull(); // already near
    expect(crossed(160000, 40000, 189000)).toBe("over");
    expect(crossed(10000, 1000, 189000)).toBeNull();
  });
  it("suggests a week from the month and checks what the client sends", () => {
    expect(weekFromMonth(810000)).toBe(189000);
    expect(weekOf("2026-11-26")).toEqual({ from: "2026-11-23", to: "2026-11-30" });
    expect(parseBudget({ month: 810000, week: 189000, from: "2026-11-26" })).toEqual({ month: 810000, week: 189000, from: "2026-11-26" });
    expect(parseBudget({ month: 810000, week: 0, from: "" })).toEqual({ month: 810000, week: 0, from: "" });
    expect(parseBudget({ month: -1, week: 0, from: "" })).toBeNull();
    expect(parseBudget({ month: 1.5, week: 0, from: "" })).toBeNull();
    expect(parseBudget({ month: 1, week: 0, from: "11/26" })).toBeNull();
  });
});
