import { describe, expect, it } from "vitest";
import { monthCell } from "@/lib/monthSlots";

const tk = (n: number, done = false) => ({ source: "own" as const, key: `o${n}`, id: n, text: `t${n}`, done });

describe("monthCell", () => {
  it("shows up to max events and counts the rest", () => {
    const r = monthCell(["a", "b", "c", "d", "e"], [], 3);
    expect(r.events).toEqual(["a", "b", "c"]);
    expect(r.hidden).toBe(2);
  });
  it("to-dos never take an event slot: they are only tallied", () => {
    const r = monthCell(["a"], [tk(1, true), tk(2), tk(3, true), tk(4)], 3);
    expect(r.events).toEqual(["a"]);
    expect(r.hidden).toBe(0);
    expect([r.done, r.total]).toEqual([2, 4]);
  });
  it("an empty day has nothing to show", () => {
    expect(monthCell([], [], 3)).toEqual({ events: [], hidden: 0, done: 0, total: 0 });
  });
});
