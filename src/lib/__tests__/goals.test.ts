import { describe, expect, it } from "vitest";
import { isMonday, isYmd, mondayOf } from "@/lib/dates";
import {
  GOAL_HARD_LIMIT, GOAL_RANGE_MAX_DAYS, GOAL_TEXT_MAX, GOAL_ID_MAX, parseGoalCreate, parseGoalId, parseGoalPatch, parseGoalQuery,
} from "@/lib/goals";

describe("isYmd / isMonday", () => {
  it("accepts real dates only", () => {
    expect(isYmd("2026-10-14")).toBe(true);
    expect(isYmd("2026-02-31")).toBe(false);
    expect(isYmd("2026-1-4")).toBe(false);
    expect(isYmd(20261014)).toBe(false);
  });
  it("matches mondayOf", () => {
    expect(isMonday("2026-10-12")).toBe(true);
    expect(isMonday("2026-10-14")).toBe(false);
    expect(isMonday(mondayOf("2026-10-18"))).toBe(true);
    expect(isMonday("2026-02-30")).toBe(false);
  });
});

describe("parseGoalCreate", () => {
  const ok = { scope: "day", period_start: "2026-10-14", text: "  run 5k  " };
  it("trims text and accepts a day goal", () => {
    expect(parseGoalCreate(ok)).toEqual({ ok: true, value: { scope: "day", period_start: "2026-10-14", text: "run 5k" } });
  });
  it("accepts a week goal on Monday", () => {
    expect(parseGoalCreate({ ...ok, scope: "week", period_start: "2026-10-12" }).ok).toBe(true);
  });
  it("rejects a week goal not on Monday (no silent normalisation)", () => {
    expect(parseGoalCreate({ ...ok, scope: "week", period_start: "2026-10-14" }).ok).toBe(false);
  });
  it("rejects bad scope, date, non-object", () => {
    expect(parseGoalCreate({ ...ok, scope: "month" }).ok).toBe(false);
    expect(parseGoalCreate({ ...ok, period_start: "2026-13-01" }).ok).toBe(false);
    expect(parseGoalCreate(null).ok).toBe(false);
    expect(parseGoalCreate([]).ok).toBe(false);
  });
  it("rejects empty, whitespace-only, non-string and too-long text", () => {
    expect(parseGoalCreate({ ...ok, text: "" }).ok).toBe(false);
    expect(parseGoalCreate({ ...ok, text: "   " }).ok).toBe(false);
    expect(parseGoalCreate({ ...ok, text: 5 }).ok).toBe(false);
    expect(parseGoalCreate({ ...ok, text: "a".repeat(GOAL_TEXT_MAX + 1) }).ok).toBe(false);
    expect(parseGoalCreate({ ...ok, text: "a".repeat(GOAL_TEXT_MAX) }).ok).toBe(true);
  });
});

describe("parseGoalPatch", () => {
  it("accepts partial updates", () => {
    expect(parseGoalPatch({ id: 3, done: true })).toEqual({ ok: true, value: { id: 3, done: true } });
    expect(parseGoalPatch({ id: 3, text: " x ", position: 2 })).toEqual({ ok: true, value: { id: 3, text: "x", position: 2 } });
  });
  it("needs a valid id and at least one field", () => {
    expect(parseGoalPatch({ done: true }).ok).toBe(false);
    expect(parseGoalPatch({ id: 1.5, done: true }).ok).toBe(false);
    expect(parseGoalPatch({ id: 3 }).ok).toBe(false);
    expect(parseGoalPatch({ id: GOAL_ID_MAX, done: true }).ok).toBe(true);
    expect(parseGoalPatch({ id: GOAL_ID_MAX + 1, done: true }).ok).toBe(false); // would overflow the int4 column (DB 500)
  });
  it("validates each field", () => {
    expect(parseGoalPatch({ id: 3, text: "  " }).ok).toBe(false);
    expect(parseGoalPatch({ id: 3, done: "yes" }).ok).toBe(false);
    expect(parseGoalPatch({ id: 3, position: -1 }).ok).toBe(false);
    expect(parseGoalPatch({ id: 3, position: 1.2 }).ok).toBe(false);
  });
});

describe("parseGoalId", () => {
  it("accepts positive integers only", () => {
    expect(parseGoalId("7")).toEqual({ ok: true, value: 7 });
    expect(parseGoalId(String(GOAL_ID_MAX))).toEqual({ ok: true, value: GOAL_ID_MAX });
    for (const v of [null, "", "abc", "1.5", "0", "-2", String(GOAL_ID_MAX + 1), "99999999999999999999"]) expect(parseGoalId(v).ok).toBe(false);
  });
});

describe("parseGoalQuery", () => {
  const q = (o: Record<string, string>) => new URLSearchParams(o);
  it("accepts an inclusive range", () => {
    expect(parseGoalQuery(q({ scope: "day", from: "2026-10-01", to: "2026-10-31" })).ok).toBe(true);
    expect(parseGoalQuery(q({ scope: "day", from: "2026-10-14", to: "2026-10-14" })).ok).toBe(true);
  });
  it("rejects bad scope, dates, reversed or oversized range", () => {
    expect(parseGoalQuery(q({ scope: "x", from: "2026-10-01", to: "2026-10-02" })).ok).toBe(false);
    expect(parseGoalQuery(q({ scope: "day", from: "2026-10-01" })).ok).toBe(false);
    expect(parseGoalQuery(q({ scope: "day", from: "2026-10-05", to: "2026-10-01" })).ok).toBe(false);
    expect(parseGoalQuery(q({ scope: "day", from: "2026-01-01", to: "2026-12-31" })).ok).toBe(false);
    expect(parseGoalQuery(q({ scope: "day", from: "2026-01-01", to: "2026-03-04" })).ok).toBe(true); // 62 days apart
    expect(parseGoalQuery(q({ scope: "day", from: "2026-01-01", to: "2026-03-05" })).ok).toBe(false);
  });
  it("allows a longer span for weeks", () => {
    expect(GOAL_RANGE_MAX_DAYS.week).toBeGreaterThan(GOAL_RANGE_MAX_DAYS.day);
    expect(parseGoalQuery(q({ scope: "week", from: "2026-01-05", to: "2026-12-28" })).ok).toBe(true);
  });
});

it("hard limit is an abuse guard, well above the UI hint of 3", () => {
  expect(GOAL_HARD_LIMIT).toBeGreaterThan(3);
});
