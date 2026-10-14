"use client";
import { useMemo, useRef } from "react";
import type { MonthData } from "@/lib/types";
import type { TodoEdit, TodoRow } from "@/lib/todosUi";
import { type TaskEntry, googleByDate, tasksByDate } from "@/lib/taskList";
import { monthUrl, monthsInRange, todosRangeUrl } from "@/lib/tasksRange";
import { useApi } from "./useApi";
import { useOptimisticList } from "./useOptimisticList";
import { TODO_SPEC } from "./useTodos";

const NONE: Record<string, TaskEntry[]> = {};

/**
 * Tasks (own to-dos + Google tasks) for the inclusive range [from, to] as date -> merged list.
 * Own to-dos come from one range request; Google tasks from the months the range touches (3 at most for 62 days),
 * through the same useApi URLs the rest of the app uses. A range that is not loaded yet keeps showing the last
 * complete answer, so changing week/month does not blink the all-day row; no Google access simply means no Google tasks.
 * `toggle` flips an own to-do (optimistic, month/todo caches refreshed once per burst by the shared list engine).
 */
export function useTasksRange(from: string, to: string) {
  const { rows, settled: ownSettled, patch } = useOptimisticList<TodoRow, TodoEdit>(todosRangeUrl(from, to), TODO_SPEC);
  const [m1, m2, m3] = monthsInRange(from, to);
  const ma = useApi<MonthData>(monthUrl(m1)), mb = useApi<MonthData>(m2 ? monthUrl(m2) : null), mc = useApi<MonthData>(m3 ? monthUrl(m3) : null);
  const [a, b, c] = [ma.data, mb.data, mc.data];
  // A month that failed to load must not hold the whole row back: it just contributes no Google tasks.
  const settled = (u: string | undefined, r: { data: MonthData | null; error: boolean }) => !u || r.data !== null || r.error;
  const ready = ownSettled && settled(m1, ma) && settled(m2, mb) && settled(m3, mc);

  const fresh = useMemo(() => tasksByDate(rows, googleByDate([a, b, c]), from, to), [rows, a, b, c, from, to]);
  const held = useRef(NONE);
  if (ready) held.current = fresh;

  const toggle = (id: number, done: boolean) => { void patch(id, { done }); };
  return { byDate: held.current, toggle, ready };
}
