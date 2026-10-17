import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, list, moods, dates, slim } = vi.hoisted(() => ({ getUser: vi.fn(), list: vi.fn(), moods: vi.fn(), dates: vi.fn(), slim: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/db", () => ({ body: { list }, diary: { moods }, workouts: { dates }, expenses: { slim } }));

import { GET } from "@/app/api/stats/insights/route";

const call = (qs: string) => GET(new Request(`http://x/api/stats/insights?${qs}`));
const day = (n: number) => new Date(Date.parse("2026-08-01") + n * 864e5).toISOString().slice(0, 10);

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me" });
  list.mockResolvedValue([]);
  moods.mockResolvedValue([]);
  dates.mockResolvedValue([]);
  slim.mockResolvedValue([]);
});

describe("GET /api/stats/insights", () => {
  it("reads a 120-day window of dates and moods only, and compares exercise days with other days", async () => {
    const ds = Array.from({ length: 20 }, (_, i) => day(i));
    moods.mockResolvedValue(ds.map((date, i) => ({ date, mood: i < 10 ? 4 : 3 })));
    dates.mockResolvedValue(ds.slice(0, 10));
    slim.mockResolvedValue([{ date: ds[0], category: "shopping", amount: 5000, need: 0 }, { date: ds[1], category: "food", amount: 9000, need: 1 }]);
    const res = await call("today=2026-10-14");
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.windowDays).toBe(120);
    expect(j.patterns.exercise).toMatchObject({ enough: true, diff: 1, yes: { days: 10, mood: 4 }, no: { days: 10, mood: 3 } });
    expect(j.patterns.waste.yes.days).toBe(1);          // only the unneeded expense counts
    expect(j.patterns.waste.enough).toBe(false);
    expect(moods).toHaveBeenCalledWith("me", "2026-06-17", "2026-10-14");
    expect(slim).toHaveBeenCalledWith("me", "2026-06-17", "2026-10-15");
  });

  it("pairs body-fat changes with the sessions in between, even when the stretch reaches past the mood window", async () => {
    list.mockResolvedValue([{ id: 2, date: "2026-10-01", fat: 217 }, { id: 1, date: "2026-05-01", fat: 230 }]); // newest first, like the db
    dates.mockResolvedValue(["2026-05-10", "2026-06-01", "2026-09-10"]);
    const j = await (await call("today=2026-10-14")).json();
    expect(dates).toHaveBeenCalledWith("me", "2026-05-01", "2026-10-14");
    expect(j.body).toHaveLength(1);
    expect(j.body[0]).toMatchObject({ from: "2026-05-01", to: "2026-10-01", fatChange: -13 });
    expect(j.body[0].perWeek).toBeCloseTo((3 / 153) * 7);
  });

  it("is unauthorized without a user, rejects a bad date, and reads nothing in both cases", async () => {
    getUser.mockResolvedValue(null);
    expect((await call("today=2026-10-14")).status).toBe(401);
    getUser.mockResolvedValue({ id: "me" });
    expect((await call("today=nope")).status).toBe(400);
    expect((await call("")).status).toBe(400);
    expect(moods).not.toHaveBeenCalled();
  });

  it("answers with empty results for a user with no records", async () => {
    const j = await (await call("today=2026-10-14")).json();
    expect(j.patterns.exercise).toMatchObject({ enough: false, diff: null });
    expect(j.body).toEqual([]);
  });
});
