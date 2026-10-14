import { describe, expect, it } from "vitest";
import { GOAL_TEXT_MAX } from "@/lib/goals";
import { TODO_TEXT_MAX, type TodoRow, isTodoLimit, normalizeTodoText, removeTodo, todosUrl, updateTodo } from "@/lib/todosUi";

const row = (id: number, over: Partial<TodoRow> = {}): TodoRow => ({ id, date: "2026-10-14", text: `t${id}`, done: false, position: id, ...over });

describe("todosUrl", () => {
  it("queries exactly one day inclusive", () => expect(todosUrl("2026-10-14")).toBe("/api/todos?from=2026-10-14&to=2026-10-14"));
});

describe("normalizeTodoText", () => {
  it("trims, rejects empty, caps at the limit", () => {
    expect(normalizeTodoText("  hi  ")).toBe("hi");
    expect(normalizeTodoText("   ")).toBeNull();
    expect(normalizeTodoText("a".repeat(TODO_TEXT_MAX))).toHaveLength(TODO_TEXT_MAX);
    expect(normalizeTodoText("a".repeat(TODO_TEXT_MAX + 1))).toBeNull();
  });
});

describe("isTodoLimit", () => {
  it("is the server's fixed 'too many todos' message, nothing else", () => {
    expect(isTodoLimit({ error: "too many todos" })).toBe(true);
    expect(isTodoLimit({ error: "bad text" })).toBe(false);
    expect(isTodoLimit({ error: 400 })).toBe(false);
    expect(isTodoLimit({})).toBe(false);
    expect(isTodoLimit(null)).toBe(false);
    expect(isTodoLimit("too many todos")).toBe(false);
  });
  it("reuses the goals text cap", () => expect(TODO_TEXT_MAX).toBe(GOAL_TEXT_MAX));
});

describe("optimistic list helpers (immutable)", () => {
  const rows = [row(1), row(2)];
  it("updateTodo changes only the matching row and leaves the input alone", () => {
    const next = updateTodo(rows, 2, { done: true });
    expect(next[1]).toEqual({ ...rows[1], done: true });
    expect(next[0]).toBe(rows[0]);
    expect(rows[1].done).toBe(false);
    expect(next).not.toBe(rows);
  });
  it("updateTodo edits text", () => expect(updateTodo(rows, 1, { text: "x" })[0].text).toBe("x"));
  it("updateTodo with an unknown id changes nothing", () => expect(updateTodo(rows, 9, { done: true })).toEqual(rows));
  it("removeTodo drops the row without mutating", () => {
    expect(removeTodo(rows, 1).map((r) => r.id)).toEqual([2]);
    expect(rows).toHaveLength(2);
  });
});
