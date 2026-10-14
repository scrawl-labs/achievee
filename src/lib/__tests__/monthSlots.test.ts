import { describe, expect, it } from "vitest";
import { mergeTasks } from "@/lib/taskList";
import { allocateMonthItems } from "@/lib/monthSlots";

const tk = (n: number, done = false) => ({ source: "own" as const, key: `o${n}`, id: n, text: `t${n}`, done });
const label = (it: { k: "e"; e: string } | { k: "t"; tk: { text: string } }) => (it.k === "e" ? it.e : it.tk.text);

describe("allocateMonthItems", () => {
  it("events take the slots first; 3 events leave no room, every task is hidden", () => {
    const r = allocateMonthItems(["a", "b", "c"], [tk(1), tk(2), tk(3)], 3);
    expect(r.items.map(label)).toEqual(["a", "b", "c"]);
    expect(r.hidden).toBe(3);
  });

  it("1 event + 5 tasks: the event, then 2 tasks, 3 hidden", () => {
    const r = allocateMonthItems(["a"], [1, 2, 3, 4, 5].map((n) => tk(n)), 3);
    expect(r.items.map(label)).toEqual(["a", "t1", "t2"]);
    expect(r.hidden).toBe(3);
  });

  it("more events than slots: extra events are hidden as well", () => {
    const r = allocateMonthItems(["a", "b", "c", "d", "e"], [tk(1)], 3);
    expect(r.items.map(label)).toEqual(["a", "b", "c"]);
    expect(r.hidden).toBe(3);
  });

  it("unfinished tasks fill the free slots before finished ones", () => {
    const r = allocateMonthItems([], [tk(1, true), tk(2), tk(3, true), tk(4)], 3);
    expect(r.items.map(label)).toEqual(["t2", "t4", "t1"]);
    expect(r.hidden).toBe(1);
  });

  it("3 events + 3 tasks fit exactly when max allows", () => {
    const r = allocateMonthItems(["a", "b", "c"], [tk(1), tk(2), tk(3)], 6);
    expect(r.items).toHaveLength(6);
    expect(r.hidden).toBe(0);
  });

  it("nothing at all", () => expect(allocateMonthItems([], [], 3)).toEqual({ items: [], hidden: 0 }));

  it("works on a merged list as is", () => {
    const r = allocateMonthItems([], mergeTasks([{ id: 1, date: "d", text: "x", done: true, position: 1 }], [{ title: "g", done: false }]), 3);
    expect(r.items.map(label)).toEqual(["g", "x"]);
  });
});
