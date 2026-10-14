import { isMonday, isYmd } from "./dates";

export type GoalScope = "day" | "week";
export type GoalRow = { id: number; scope: GoalScope; period_start: string; text: string; done: boolean; position: number };
export type GoalCreate = { scope: GoalScope; period_start: string; text: string };
export type GoalPatch = { id: number; text?: string; done?: boolean; position?: number };
export type GoalQuery = { scope: GoalScope; from: string; to: string };
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export const GOAL_SCOPES: readonly GoalScope[] = ["day", "week"];
export const GOAL_TEXT_MAX = 200;
/**
 * Abuse guard only. The "3 goals" figure is a UI hint: the server neither enforces it nor reports it.
 * Exceeding this many goals per (user, scope, period_start) is rejected with 400.
 */
export const GOAL_HARD_LIMIT = 20;
export const GOAL_POSITION_MAX = 1000;
/** Largest id the DB column (int4) can hold; anything above would be a 500 from Postgres instead of a 400. */
export const GOAL_ID_MAX = 2147483647;
/** Longest allowed GET span (inclusive, in days) per scope: 62 days, or 53 weeks. */
export const GOAL_RANGE_MAX_DAYS: Record<GoalScope, number> = { day: 62, week: 53 * 7 };
const DAY_MS = 864e5;

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isScope = (v: unknown): v is GoalScope => GOAL_SCOPES.includes(v as GoalScope);
export const isGoalId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0 && v <= GOAL_ID_MAX;

export function parseText(v: unknown): Parsed<string> {
  if (typeof v !== "string") return fail("bad text");
  const t = v.trim();
  return t.length >= 1 && t.length <= GOAL_TEXT_MAX ? { ok: true, value: t } : fail("bad text");
}

export function parseGoalCreate(b: unknown): Parsed<GoalCreate> {
  if (!isRecord(b)) return fail("bad input");
  if (!isScope(b.scope)) return fail("bad scope");
  // A week goal must start on the week's Monday, like weekly_review.week_start (rejected, not normalised).
  const startOk = b.scope === "week" ? isMonday(b.period_start) : isYmd(b.period_start);
  if (!startOk) return fail("bad period_start");
  const text = parseText(b.text);
  if (!text.ok) return text;
  return { ok: true, value: { scope: b.scope, period_start: b.period_start as string, text: text.value } };
}

export function parseGoalPatch(b: unknown): Parsed<GoalPatch> {
  if (!isRecord(b) || !isGoalId(b.id)) return fail("bad input");
  const out: GoalPatch = { id: b.id };
  let value: GoalPatch = out;
  if ("text" in b && b.text !== undefined) {
    const t = parseText(b.text);
    if (!t.ok) return t;
    value = { ...value, text: t.value };
  }
  if ("done" in b && b.done !== undefined) {
    if (typeof b.done !== "boolean") return fail("bad done");
    value = { ...value, done: b.done };
  }
  if ("position" in b && b.position !== undefined) {
    const p = b.position;
    if (typeof p !== "number" || !Number.isInteger(p) || p < 0 || p > GOAL_POSITION_MAX) return fail("bad position");
    value = { ...value, position: p };
  }
  return Object.keys(value).length > 1 ? { ok: true, value } : fail("nothing to update");
}

export function parseGoalId(raw: string | null): Parsed<number> {
  const id = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
  return isGoalId(id) && Number.isSafeInteger(id) ? { ok: true, value: id } : fail("bad id");
}

export function parseGoalQuery(p: URLSearchParams): Parsed<GoalQuery> {
  const scope = p.get("scope"), from = p.get("from"), to = p.get("to");
  if (!isScope(scope)) return fail("bad scope");
  if (!isYmd(from) || !isYmd(to) || to < from) return fail("bad range");
  const span = (Date.parse(to) - Date.parse(from)) / DAY_MS;
  return span <= GOAL_RANGE_MAX_DAYS[scope] ? { ok: true, value: { scope, from, to } } : fail("bad range");
}
