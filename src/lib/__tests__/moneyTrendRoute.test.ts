import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, eSlim, iSlim, sSlim } = vi.hoisted(() => ({ getUser: vi.fn(), eSlim: vi.fn(), iSlim: vi.fn(), sSlim: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/db", () => ({ expenses: { slim: eSlim }, income: { slim: iSlim }, savings: { slim: sSlim } }));

import { GET } from "@/app/api/trends/money/route";

const call = (qs: string) => GET(new Request(`http://x/api/trends/money?${qs}`));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me" });
  eSlim.mockResolvedValue([
    { date: "2026-09-05", category: "fixed", amount: 700000, need: 1 },
    { date: "2026-09-07", category: "shopping", amount: 100000, need: 0 },
  ]);
  iSlim.mockResolvedValue([{ date: "2026-09-25", amount: 3000000 }]);
  sSlim.mockResolvedValue([{ date: "2026-09-30", amount: 600000 }]);
});

describe("GET /api/trends/money", () => {
  it("reads one window for the whole run of periods (memo-free) and answers per period, oldest first", async () => {
    const res = await call("anchor=2026-10-14&startDay=1&n=3");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("private");
    const { periods } = await res.json();
    expect(periods.map((p: { from: string }) => p.from)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
    expect(periods[1]).toMatchObject({ income: 3000000, fixed: 700000, variable: 100000, waste: 100000, saved: 600000 });
    for (const m of [eSlim, iSlim, sSlim]) expect(m).toHaveBeenCalledWith("me", "2026-08-01", "2026-11-01");
  });

  it("is unauthorized without a user and reads nothing", async () => {
    getUser.mockResolvedValue(null);
    expect((await call("anchor=2026-10-14")).status).toBe(401);
    expect(eSlim).not.toHaveBeenCalled();
  });

  it.each([
    ["no anchor", ""], ["bad anchor", "anchor=2026-13-40"], ["start day 0", "anchor=2026-10-14&startDay=0"], ["start day 29", "anchor=2026-10-14&startDay=29"],
    ["fractional start day", "anchor=2026-10-14&startDay=1.5"], ["zero periods", "anchor=2026-10-14&n=0"], ["too many periods", "anchor=2026-10-14&n=13"],
  ])("rejects %s with 400 before touching the database", async (_name, qs) => {
    expect((await call(qs)).status).toBe(400);
    expect(eSlim).not.toHaveBeenCalled();
  });
});
