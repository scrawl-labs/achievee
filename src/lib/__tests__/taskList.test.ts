import { describe, expect, it } from "vitest";
import type { TodoRow } from "@/lib/todosUi";
import type { MonthData } from "@/lib/types";
import { googleByDate, mergeTasks, taskCounts, tasksByDate } from "@/lib/taskList";

const own = (id: number, over: Partial<TodoRow> = {}): TodoRow => ({ id, date: "2026-10-14", text: `own${id}`, done: false, position: id, ...over });
const g = (title: string, done = false) => ({ title, done });

describe("mergeTasks", () => {
  it("puts unfinished first, then finished; own before Google inside a group", () => {
    const res = mergeTasks([own(1, { done: true }), own(2)], [g("G1", true), g("G2")]);
    expect(res.map((e) => e.text)).toEqual(["own2", "G2", "own1", "G1"]);
  });

  it("keeps the given order inside a group (stable)", () => {
    const res = mergeTasks([own(3), own(1), own(2)], [g("b"), g("a")]);
    expect(res.map((e) => e.text)).toEqual(["own3", "own1", "own2", "b", "a"]);
  });

  it("marks the source; own rows carry their id, Google rows do not", () => {
    const [a, b] = mergeTasks([own(7)], [g("x")]);
    expect(a).toMatchObject({ source: "own", id: 7, text: "own7", done: false });
    expect(b).toMatchObject({ source: "google", text: "x" });
    expect("id" in b).toBe(false);
  });

  it("gives every row a unique key, even with equal Google titles", () => {
    const keys = mergeTasks([own(1)], [g("same"), g("same")]).map((e) => e.key);
    expect(new Set(keys).size).toBe(3);
  });

  it("handles empty inputs and never modifies them", () => {
    expect(mergeTasks([], [])).toEqual([]);
    const o = [own(1, { done: true }), own(2)], gl = [g("a", true), g("b")];
    const snap = JSON.stringify([o, gl]);
    mergeTasks(o, gl);
    expect(JSON.stringify([o, gl])).toBe(snap);
  });

  it("keeps an empty Google title as is (the view shows the untitled label)", () => {
    expect(mergeTasks([], [g("")])[0].text).toBe("");
  });
});

describe("taskCounts", () => {
  it("counts the merged list itself, so Google tasks and own to-dos are each counted once", () => {
    expect(taskCounts(mergeTasks([own(1, { done: true }), own(2)], [g("a", true), g("b")]))).toEqual({ done: 2, total: 4 });
    expect(taskCounts([])).toEqual({ done: 0, total: 0 });
  });
});

const month = (ym: string, days: Record<string, { title: string; done: boolean }[]>): MonthData => ({
  ym,
  days: Object.fromEntries(Object.entries(days).map(([date, tasks]) => [date, { date, done: 0, total: tasks.length, events: 0, tasks, eventList: [] }])),
});

describe("googleByDate", () => {
  it("flattens months to date -> tasks, skipping missing months and empty days", () => {
    const res = googleByDate([month("2026-10", { "2026-10-31": [g("a")], "2026-10-30": [] }), null, month("2026-11", { "2026-11-01": [g("b")] })]);
    expect(res).toEqual({ "2026-10-31": [g("a")], "2026-11-01": [g("b")] });
  });
});

describe("tasksByDate", () => {
  it("groups own rows and Google tasks by day, merged and sorted per day", () => {
    const res = tasksByDate(
      [own(1, { date: "2026-10-14", done: true }), own(2, { date: "2026-10-14" }), own(3, { date: "2026-10-15" })],
      { "2026-10-14": [g("G")], "2026-10-16": [g("H")] },
      "2026-10-14", "2026-10-16",
    );
    expect(Object.keys(res).sort()).toEqual(["2026-10-14", "2026-10-15", "2026-10-16"]);
    expect(res["2026-10-14"].map((e) => e.text)).toEqual(["own2", "G", "own1"]);
    expect(res["2026-10-16"].map((e) => e.text)).toEqual(["H"]);
  });

  it("ignores days outside the inclusive range", () => {
    const res = tasksByDate([own(1, { date: "2026-10-13" }), own(2, { date: "2026-10-18" })], { "2026-10-19": [g("x")] }, "2026-10-14", "2026-10-18");
    expect(Object.keys(res)).toEqual(["2026-10-18"]);
  });

  it("is empty when there is nothing", () => expect(tasksByDate([], {}, "2026-10-14", "2026-10-14")).toEqual({}));
});
