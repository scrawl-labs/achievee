import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, dates, slim } = vi.hoisted(() => ({ getUser: vi.fn(), dates: vi.fn(), slim: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/db", () => ({ workouts: { dates }, expenses: { slim } }));

import { GET } from "@/app/api/stats/emotion-context/route";
const call = (qs: string) => GET(new Request(`http://x/api/stats/emotion-context?${qs}`));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me" });
  dates.mockResolvedValue([]);
  slim.mockResolvedValue([]);
});

describe("GET /api/stats/emotion-context", () => {
  it("returns only dates: workout days and days with an unneeded expense, over 180 days", async () => {
    dates.mockResolvedValue(["2026-10-01", "2026-10-01", "2026-10-03"]);
    slim.mockResolvedValue([
      { date: "2026-10-02", category: "food", amount: 9000, need: 1 },
      { date: "2026-10-04", category: "shopping", amount: 5000, need: 0 },
      { date: "2026-10-04", category: "shopping", amount: 3000, need: 0 },
    ]);
    const j = await (await call("today=2026-10-14")).json();
    expect(j).toEqual({ exercise: ["2026-10-01", "2026-10-03"], unneeded: ["2026-10-04"], from: "2026-04-18" });
    expect(dates).toHaveBeenCalledWith("me", "2026-04-18", "2026-10-14");
    expect(slim).toHaveBeenCalledWith("me", "2026-04-18", "2026-10-15");
  });
  it("is unauthorized without a user and rejects a bad date", async () => {
    getUser.mockResolvedValue(null);
    expect((await call("today=2026-10-14")).status).toBe(401);
    getUser.mockResolvedValue({ id: "me" });
    expect((await call("today=nope")).status).toBe(400);
    expect(dates).not.toHaveBeenCalled();
  });
});
