import { addDays, isYmd, mondayOf } from "./dates";

/**
 * Spending goals: one for the pay month (the period set by the month start day) and one for the week (Monday to Sunday).
 * Fixed costs (category "fixed": rent, insurance, phone) are left out: they are not something a week can steer.
 * `from` is the first day the goals count (e.g. the day after the next pay day); "" means they always did.
 */
export type Budget = { month: number; week: number; from: string };
export const NO_BUDGET: Budget = { month: 0, week: 0, from: "" };
export const BUDGET_MAX = 1_000_000_000;
/** At this share of a goal the screen says it is getting close. */
export const NEAR = 0.8;

export type BudgetLevel = "ok" | "near" | "over";
export type BudgetLine = { limit: number; spent: number; left: number; ratio: number; level: BudgetLevel; since: string; partial: boolean };

const isAmount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= BUDGET_MAX;

/** A goal update from the client: both amounts (0 = no goal) and the start day. */
export function parseBudget(b: unknown): Budget | null {
  if (!b || typeof b !== "object") return null;
  const { month, week, from } = b as Record<string, unknown>;
  if (!isAmount(month) || !isAmount(week)) return null;
  if (from !== "" && !isYmd(from)) return null;
  return { month, week, from: from as string };
}

/** What the screen suggests for the week when only the month is set: the month spread over 30 days, times 7, to the nearest 1,000. */
export const weekFromMonth = (month: number) => Math.round((month * 7) / 30 / 1000) * 1000;

export const levelOf = (spent: number, limit: number): BudgetLevel => (spent > limit ? "over" : spent >= limit * NEAR ? "near" : "ok");

type Spend = { date: string; category: string; amount: number };
/** Spending in [from, to) that counts toward a goal: everything but fixed costs. */
export const countable = (rows: readonly Spend[], from: string, to: string) =>
  rows.filter((r) => r.category !== "fixed" && r.date >= from && r.date < to).reduce((s, r) => s + r.amount, 0);

/**
 * One goal over the range [start, end): null when there is no goal or the range ends before the goals start.
 * A range the start day cuts into counts only from that day; for the week the goal shrinks to the days left
 * (from Thursday: 4/7 of it), for the month the whole goal stays (the period is what the goal was set for).
 */
export function budgetLine(rows: readonly Spend[], goal: number, start: string, end: string, from: string, prorate: boolean): BudgetLine | null {
  if (goal <= 0 || (from && end <= from)) return null;
  const since = from && from > start ? from : start;
  const partial = since !== start;
  const days = (Date.parse(end) - Date.parse(since)) / 864e5, all = (Date.parse(end) - Date.parse(start)) / 864e5;
  const limit = partial && prorate ? Math.round((goal * days) / all / 100) * 100 : goal;
  const spent = countable(rows, since, end);
  return { limit, spent, left: limit - spent, ratio: limit > 0 ? spent / limit : 0, level: levelOf(spent, limit), since, partial };
}

/** The Monday-to-Sunday week around a day, `to` exclusive. */
export const weekOf = (date: string) => { const from = mondayOf(date); return { from, to: addDays(from, 7) }; };

/** After adding `amount`, whether that just pushed the goal into a new level (near or over), to say so once. */
export const crossed = (before: number, amount: number, limit: number): BudgetLevel | null => {
  const a = levelOf(before, limit), b = levelOf(before + amount, limit);
  return a !== b && b !== "ok" ? b : null;
};
