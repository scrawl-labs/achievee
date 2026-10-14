import type { MonthData, TaskItem } from "./types";
import type { TodoRow } from "./todosUi";

/** One row of the unified task list: an own to-do (editable) or a Google task (read-only). Pure helpers, no React, no I/O. */
export type TaskEntry =
  | { source: "own"; key: string; id: number; text: string; done: boolean }
  | { source: "google"; key: string; text: string; done: boolean };

/**
 * Own to-dos and Google tasks as one list: unfinished first, then finished; inside a group own rows come first,
 * then the rest in the order given (both inputs are already ordered by their source). Inputs are never modified.
 */
export function mergeTasks(own: readonly TodoRow[], google: readonly TaskItem[]): TaskEntry[] {
  const all: TaskEntry[] = [
    ...own.map((r): TaskEntry => ({ source: "own", key: `o${r.id}`, id: r.id, text: r.text, done: r.done })),
    ...google.map((g, i): TaskEntry => ({ source: "google", key: `g${i}`, text: g.title, done: g.done })),
  ];
  return [...all.filter((e) => !e.done), ...all.filter((e) => e.done)];
}

/** Counted from the merged list itself. /api/month's done/total already includes own to-dos, so never add the two. */
export const taskCounts = (list: readonly TaskEntry[]) => ({ done: list.filter((e) => e.done).length, total: list.length });

/** Google tasks of several months (null = not loaded) as date -> tasks; days without tasks are left out. */
export function googleByDate(months: readonly (MonthData | null)[]): Record<string, TaskItem[]> {
  const out: Record<string, TaskItem[]> = {};
  for (const m of months) {
    if (!m) continue;
    for (const [date, d] of Object.entries(m.days)) if (d.tasks.length > 0) out[date] = [...d.tasks];
  }
  return out;
}

/** Merged tasks per day for the inclusive range [from, to]; days with nothing are left out. */
export function tasksByDate(own: readonly TodoRow[], google: Readonly<Record<string, readonly TaskItem[]>>, from: string, to: string): Record<string, TaskEntry[]> {
  const ownBy: Record<string, TodoRow[]> = {};
  for (const r of own) if (r.date >= from && r.date <= to) (ownBy[r.date] ??= []).push(r);
  const dates = new Set([...Object.keys(ownBy), ...Object.keys(google).filter((d) => d >= from && d <= to)]);
  const out: Record<string, TaskEntry[]> = {};
  for (const d of dates) {
    const list = mergeTasks(ownBy[d] ?? [], google[d] ?? []);
    if (list.length > 0) out[d] = list;
  }
  return out;
}
