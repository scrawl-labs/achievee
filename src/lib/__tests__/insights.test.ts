import { describe, expect, it } from "vitest";
import { MIN_DAYS_PER_GROUP, bodyVsWorkout, moodPatterns, moodVerdict, windowStart } from "@/lib/insights";

const days = (n: number, from = "2026-09-01") => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.parse(from) + i * 864e5); return d.toISOString().slice(0, 10);
});

describe("moodPatterns", () => {
  // 20 days; the first 10 are exercise days with mood 4, the rest rest days with mood 3
  const ds = days(20);
  const moods = ds.map((date, i) => ({ date, mood: i < 10 ? 4 : 3 }));
  it("compares the average mood on exercise days and other days", () => {
    const { exercise } = moodPatterns(moods, ds.slice(0, 10), []);
    expect(exercise.enough).toBe(true);
    expect(exercise.yes).toEqual({ days: 10, mood: 4 });
    expect(exercise.no).toEqual({ days: 10, mood: 3 });
    expect(exercise.diff).toBe(1);
  });
  it("says nothing when either group is below the minimum number of days", () => {
    const { exercise } = moodPatterns(moods, ds.slice(0, MIN_DAYS_PER_GROUP - 1), []);
    expect(exercise.enough).toBe(false);
    expect(exercise.diff).toBeNull();
    const none = moodPatterns(moods, [], []).exercise;
    expect(none).toMatchObject({ enough: false, diff: null });
    expect(none.yes).toEqual({ days: 0, mood: null });
  });
  it("only days with a mood entry take part, however many workouts fall elsewhere", () => {
    const { exercise } = moodPatterns(moods.slice(0, 12), [...ds.slice(0, 6), "2030-01-01"], []);
    expect(exercise.yes.days).toBe(6);
    expect(exercise.no.days).toBe(6);
  });
  it("compares days with and without an unneeded expense on their own", () => {
    const { waste, exercise } = moodPatterns(moods, [], ds.filter((_, i) => i % 2 === 0));
    expect(waste.yes.days).toBe(10);
    expect(waste.no.days).toBe(10);
    expect(waste.diff).toBeCloseTo(0, 5);          // evens and odds both span the 4s and 3s equally
    expect(exercise.enough).toBe(false);
  });
});

describe("moodVerdict", () => {
  it("calls a small difference no difference", () => {
    expect(moodVerdict(0.1)).toBe("none");
    expect(moodVerdict(-0.19)).toBe("none");
    expect(moodVerdict(0.2)).toBe("up");
    expect(moodVerdict(-0.6)).toBe("down");
  });
});

describe("bodyVsWorkout", () => {
  const reads = [{ date: "2026-08-01", fat: 230 }, { date: "2026-09-01", fat: 222 }, { date: "2026-10-01", fat: 217 }];
  it("pairs each body-fat change with sessions per week in that stretch, newest first", () => {
    const workouts = [...days(31, "2026-08-01").filter((_, i) => i % 3 === 0), ...days(30, "2026-09-01").filter((_, i) => i % 2 === 0)];
    const out = bodyVsWorkout(reads, workouts);
    expect(out.map((i) => [i.from, i.to, i.fatChange])).toEqual([["2026-09-01", "2026-10-01", -5], ["2026-08-01", "2026-09-01", -8]]);
    expect(out[0].perWeek).toBeCloseTo((15 / 30) * 7);
    expect(out[1].perWeek).toBeCloseTo((11 / 31) * 7);
  });
  it("counts a session on the first reading day but not on the last (it belongs to the next stretch)", () => {
    const out = bodyVsWorkout([{ date: "2026-09-01", fat: 200 }, { date: "2026-09-15", fat: 199 }], ["2026-09-01", "2026-09-15"]);
    expect(out[0].perWeek).toBeCloseTo((1 / 14) * 7);
  });
  it("skips readings less than a week apart, readings without body fat, and needs two readings", () => {
    expect(bodyVsWorkout([{ date: "2026-09-01", fat: 200 }, { date: "2026-09-05", fat: 199 }], [])).toEqual([]);
    expect(bodyVsWorkout([{ date: "2026-09-01" }, { date: "2026-09-20", fat: 199 }], [])).toEqual([]);
    expect(bodyVsWorkout([{ date: "2026-09-01", fat: 200 }], [])).toEqual([]);
  });
  it("sorts readings by date and keeps only the newest few", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ date: `2026-0${i + 1}-01`, fat: 250 - i }));
    const out = bodyVsWorkout([...many].reverse(), [], 3);
    expect(out).toHaveLength(3);
    expect(out[0].to).toBe("2026-09-01");
  });
});

describe("windowStart", () => {
  it("is the first day of a window that ends today", () => {
    expect(windowStart("2026-10-14", 1)).toBe("2026-10-14");
    expect(windowStart("2026-10-14", 120)).toBe("2026-06-17");
  });
});
