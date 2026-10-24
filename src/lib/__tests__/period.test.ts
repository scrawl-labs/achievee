import { describe, expect, it } from "vitest";
import { cleanOverrides, periodOf, periodStart } from "../period";
import { periodsBack } from "../moneyTrend";

describe("periodOf", () => {
  it("is the usual month when nothing is overridden", () => {
    expect(periodOf("2026-10-10", 25)).toEqual({ from: "2026-09-25", to: "2026-10-25" });
    expect(periodOf("2026-10-25", 25)).toEqual({ from: "2026-10-25", to: "2026-11-25" });
    expect(periodOf("2026-10-14", 1)).toEqual({ from: "2026-10-01", to: "2026-11-01" });
    expect(periodOf("2026-01-03", 25)).toEqual({ from: "2025-12-25", to: "2026-01-25" });
  });
  it("starts a month's period on its own day when the salary came early", () => {
    const ov = { "2026-10": 23 };
    expect(periodOf("2026-10-24", 25, ov)).toEqual({ from: "2026-10-23", to: "2026-11-25" });   // was in September's period
    expect(periodOf("2026-10-22", 25, ov)).toEqual({ from: "2026-09-25", to: "2026-10-23" });
    expect(periodOf("2026-10-23", 25, ov)).toEqual({ from: "2026-10-23", to: "2026-11-25" });
    expect(periodStart("2026-11", 25, ov)).toBe("2026-11-25");
  });
  it("keeps the periods back to back across a year boundary", () => {
    const ov = { "2026-01": 22 };
    expect(periodOf("2025-12-31", 25, ov)).toEqual({ from: "2025-12-25", to: "2026-01-22" });
    expect(periodOf("2026-01-22", 25, ov)).toEqual({ from: "2026-01-22", to: "2026-02-25" });
  });
  it("periodsBack walks over the overridden boundary without a gap or an overlap", () => {
    const r = periodsBack("2026-11-30", 25, 3, { "2026-10": 23 });
    expect(r.map((x) => [x.from, x.to])).toEqual([["2026-09-25", "2026-10-23"], ["2026-10-23", "2026-11-25"], ["2026-11-25", "2026-12-25"]]);
  });
});

describe("cleanOverrides", () => {
  it("keeps only YYYY-MM keys with a whole day from 1 to 28", () => {
    expect(cleanOverrides({ "2026-10": 23, "2026-13": 5, "26-10": 3, "2026-09": 29, "2026-08": 1.5, "2026-07": "9" })).toEqual({ "2026-10": 23 });
    expect(cleanOverrides(null)).toEqual({});
  });
});
