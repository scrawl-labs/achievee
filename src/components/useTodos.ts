"use client";
import { useCallback } from "react";
import { type TodoEdit, type TodoRow, isTodoLimit, removeTodo, todosUrl, updateTodo } from "@/lib/todosUi";
import { invalidate } from "./useApi";
import { type ListSpec, useOptimisticList } from "./useOptimisticList";

/** The month badges and stats sum these to-dos on the server, so a change only needs the month cache refreshed (no optimistic badge math). */
const SPEC: ListSpec<TodoRow, TodoEdit> = {
  endpoint: "/api/todos",
  update: updateTodo,
  remove: removeTodo,
  isLimit: async (r) => isTodoLimit(await r.json().catch(() => null)),
  onChanged: () => invalidate("/api/month"),
};

/** Own to-dos of one day; callers give the list `key={date}` so switching day remounts it. */
export function useTodos(date: string) {
  const { rows, error, add: addRow, patch, remove } = useOptimisticList(todosUrl(date), SPEC);
  const add = useCallback((text: string) => addRow({ date, text }), [addRow, date]);
  return { rows, error, add, patch, remove };
}
