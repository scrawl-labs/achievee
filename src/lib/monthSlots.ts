import type { TaskEntry } from "./taskList";

/**
 * One month cell: up to `max` events (in the order given), how many more did not fit, and the day's to-dos as a tally.
 * To-dos are not listed one by one: daily ones (a Google task list, a habit) would fill every cell with the same lines.
 */
export function monthCell<E>(events: readonly E[], tasks: readonly TaskEntry[], max: number): { events: E[]; hidden: number; done: number; total: number } {
  return {
    events: events.slice(0, max),
    hidden: Math.max(0, events.length - max),
    done: tasks.filter((t) => t.done).length,
    total: tasks.length,
  };
}
