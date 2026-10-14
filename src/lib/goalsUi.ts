import { mondayOf } from "./dates";
import { GOAL_TEXT_MAX, type GoalRow, type GoalScope } from "./goals";

/** Gentle nudge threshold only: the server enforces GOAL_HARD_LIMIT, never this. */
export const GOAL_SOFT_HINT_AFTER = 3;

export const showSoftHint = (count: number) => count > GOAL_SOFT_HINT_AFTER;

/** Day goals belong to the date; week goals to that week's Monday (the server rejects any other day). */
export const periodStartOf = (scope: GoalScope, date: string) => (scope === "week" ? mondayOf(date) : date);

/** One period, inclusive on both ends (the API's `to` is inclusive). */
export const goalsUrl = (scope: GoalScope, periodStart: string) =>
  `/api/goals?scope=${scope}&from=${periodStart}&to=${periodStart}`;

/** Trimmed text, or null when it would be rejected (empty / over the limit). */
export function normalizeGoalText(raw: string): string | null {
  const t = raw.trim();
  return t.length >= 1 && t.length <= GOAL_TEXT_MAX ? t : null;
}

export type GoalEdit = Partial<Pick<GoalRow, "text" | "done">>;
export const updateGoal = (rows: readonly GoalRow[], id: number, edit: GoalEdit): GoalRow[] =>
  rows.map((r) => (r.id === id ? { ...r, ...edit } : r));
export const removeGoal = (rows: readonly GoalRow[], id: number): GoalRow[] => rows.filter((r) => r.id !== id);
