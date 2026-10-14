import { describe, expect, it } from "vitest";
import { monthsInRange, todosRangeUrl } from "@/lib/tasksRange";

describe("monthsInRange", () => {
  it("one month for a day, a week inside a month and a whole month", () => {
    expect(monthsInRange("2026-10-14", "2026-10-14")).toEqual(["2026-10"]);
    expect(monthsInRange("2026-10-12", "2026-10-18")).toEqual(["2026-10"]);
    expect(monthsInRange("2026-10-01", "2026-10-31")).toEqual(["2026-10"]);
  });

  it("a week that crosses a month boundary needs both months", () => {
    expect(monthsInRange("2026-10-26", "2026-11-01")).toEqual(["2026-10", "2026-11"]);
  });

  it("crosses a year boundary in order", () => {
    expect(monthsInRange("2026-12-28", "2027-01-03")).toEqual(["2026-12", "2027-01"]);
  });

  it("includes every month in between for a long range (62 days can touch three months)", () => {
    expect(monthsInRange("2026-01-31", "2026-03-01")).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  it("an inverted range yields only the start month rather than looping", () => {
    expect(monthsInRange("2026-10-14", "2026-09-01")).toEqual(["2026-10"]);
  });
});

describe("todosRangeUrl", () => {
  it("uses the API's inclusive from/to", () => expect(todosRangeUrl("2026-10-12", "2026-10-18")).toBe("/api/todos?from=2026-10-12&to=2026-10-18"));
});
