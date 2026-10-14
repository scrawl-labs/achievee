import { describe, expect, it } from "vitest";
import { GOAL_HARD_LIMIT, GOAL_TEXT_MAX, type GoalRow } from "@/lib/goals";
import { GOAL_SOFT_HINT_AFTER, goalsUrl, normalizeGoalText, periodStartOf, removeGoal, showSoftHint, updateGoal } from "@/lib/goalsUi";

const row = (id: number, over: Partial<GoalRow> = {}): GoalRow => ({ id, scope: "day", period_start: "2026-10-14", text: `g${id}`, done: false, position: id, ...over });

describe("periodStartOf", () => {
  it("day goals use the date itself", () => expect(periodStartOf("day", "2026-10-14")).toBe("2026-10-14"));
  it("week goals use that week's Monday (Sunday belongs to the week before)", () => {
    expect(periodStartOf("week", "2026-10-14")).toBe("2026-10-12");
    expect(periodStartOf("week", "2026-10-12")).toBe("2026-10-12");
    expect(periodStartOf("week", "2026-10-18")).toBe("2026-10-12");
    expect(periodStartOf("week", "2026-10-19")).toBe("2026-10-19");
  });
});

describe("goalsUrl", () => {
  it("queries exactly one period inclusive", () => expect(goalsUrl("week", "2026-10-12")).toBe("/api/goals?scope=week&from=2026-10-12&to=2026-10-12"));
});

describe("showSoftHint", () => {
  it("stays quiet up to the soft limit and shows after it", () => {
    expect(showSoftHint(0)).toBe(false);
    expect(showSoftHint(GOAL_SOFT_HINT_AFTER)).toBe(false);
    expect(showSoftHint(GOAL_SOFT_HINT_AFTER + 1)).toBe(true);
    expect(GOAL_SOFT_HINT_AFTER).toBeLessThan(GOAL_HARD_LIMIT);
  });
});

describe("normalizeGoalText", () => {
  it("trims, rejects empty, caps at the server limit", () => {
    expect(normalizeGoalText("  hi  ")).toBe("hi");
    expect(normalizeGoalText("   ")).toBeNull();
    expect(normalizeGoalText("a".repeat(GOAL_TEXT_MAX))).toHaveLength(GOAL_TEXT_MAX);
    expect(normalizeGoalText("a".repeat(GOAL_TEXT_MAX + 1))).toBeNull();
  });
});

describe("optimistic list helpers (immutable)", () => {
  const rows = [row(1), row(2)];
  it("updateGoal patches one row and leaves the input untouched", () => {
    const next = updateGoal(rows, 2, { done: true });
    expect(next.map((r) => r.done)).toEqual([false, true]);
    expect(rows[1].done).toBe(false);
    expect(next[0]).toBe(rows[0]);
  });
  it("updateGoal with an unknown id changes nothing", () => expect(updateGoal(rows, 9, { done: true })).toEqual(rows));
  it("removeGoal drops the row", () => {
    expect(removeGoal(rows, 1).map((r) => r.id)).toEqual([2]);
    expect(rows).toHaveLength(2);
  });
});
