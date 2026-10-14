import type { TaskEntry } from "./taskList";

export type MonthItem<E> = { k: "e"; e: E } | { k: "t"; tk: TaskEntry };

/**
 * Fills the `max` chip slots of one month cell: events first (in the order given), then tasks (unfinished before finished)
 * in whatever slots are left. Everything that does not fit is only counted in `hidden` ("+N more").
 */
export function allocateMonthItems<E>(events: readonly E[], tasks: readonly TaskEntry[], max: number): { items: MonthItem<E>[]; hidden: number } {
  const ordered = [...tasks.filter((t) => !t.done), ...tasks.filter((t) => t.done)];
  const all: MonthItem<E>[] = [...events.map((e): MonthItem<E> => ({ k: "e", e })), ...ordered.map((tk): MonthItem<E> => ({ k: "t", tk }))];
  return { items: all.slice(0, max), hidden: Math.max(0, all.length - max) };
}
