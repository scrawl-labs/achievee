import { isYmd } from "./dates";
import { GOAL_ID_MAX, GOAL_POSITION_MAX, GOAL_TEXT_MAX, fail, isGoalId, isRecord, parseText, type Parsed } from "./goals";
import type { DayData } from "./types";

export type TodoRow = { id: number; date: string; text: string; done: boolean; position: number };
export type TodoCreate = { date: string; text: string };
export type TodoPatch = { id: number; text?: string; done?: boolean; date?: string; position?: number };
export type TodoQuery = { from: string; to: string };
/** What the month aggregation needs: no text, so nothing has to be decrypted. */
export type TodoCountRow = { date: string; done: boolean };

export const TODO_TEXT_MAX = GOAL_TEXT_MAX;
export const TODO_ID_MAX = GOAL_ID_MAX;
export const TODO_POSITION_MAX = GOAL_POSITION_MAX;
/** Abuse guard only: more than this many todos on one (user, date) is rejected with 400 (create, and move into that day). */
export const TODO_HARD_LIMIT = 50;
/** Longest allowed GET span in days (to - from), like the day-scope goal range. */
export const TODO_RANGE_MAX_DAYS = 62;
const DAY_MS = 864e5;

export function parseTodoCreate(b: unknown): Parsed<TodoCreate> {
  if (!isRecord(b)) return fail("bad input");
  if (!isYmd(b.date)) return fail("bad date");
  const text = parseText(b.text);
  return text.ok ? { ok: true, value: { date: b.date, text: text.value } } : text;
}

function patchField(b: Record<string, unknown>, key: keyof TodoPatch): Parsed<Partial<TodoPatch>> | null {
  const v = b[key];
  if (v === undefined) return null;
  switch (key) {
    case "text": { const t = parseText(v); return t.ok ? { ok: true, value: { text: t.value } } : t; }
    case "done": return typeof v === "boolean" ? { ok: true, value: { done: v } } : fail("bad done");
    case "date": return isYmd(v) ? { ok: true, value: { date: v } } : fail("bad date");
    case "position":
      return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= TODO_POSITION_MAX ? { ok: true, value: { position: v } } : fail("bad position");
    default: return null;
  }
}

export function parseTodoPatch(b: unknown): Parsed<TodoPatch> {
  if (!isRecord(b) || !isGoalId(b.id)) return fail("bad input");
  let value: TodoPatch = { id: b.id };
  for (const key of ["text", "done", "date", "position"] as const) {
    const f = patchField(b, key);
    if (f === null) continue;
    if (!f.ok) return f;
    value = { ...value, ...f.value };
  }
  return Object.keys(value).length > 1 ? { ok: true, value } : fail("nothing to update");
}

export function parseTodoId(raw: string | null): Parsed<number> {
  const id = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
  return isGoalId(id) && Number.isSafeInteger(id) ? { ok: true, value: id } : fail("bad id");
}

export function parseTodoQuery(p: URLSearchParams): Parsed<TodoQuery> {
  const from = p.get("from"), to = p.get("to");
  if (!isYmd(from) || !isYmd(to) || to < from) return fail("bad range");
  return (Date.parse(to) - Date.parse(from)) / DAY_MS <= TODO_RANGE_MAX_DAYS ? { ok: true, value: { from, to } } : fail("bad range");
}

/**
 * Adds the month's own todos to the per-day done/total counts. Pure: returns new day objects, never touches the
 * input, and ignores todos whose date is not one of the given days. The Google `tasks` list is left as it is.
 */
export function mergeTodoCounts(days: Readonly<Record<string, DayData>>, todos: readonly TodoCountRow[]): Record<string, DayData> {
  const add = new Map<string, { done: number; total: number }>();
  for (const t of todos) {
    if (!Object.prototype.hasOwnProperty.call(days, t.date)) continue;
    const c = add.get(t.date) ?? { done: 0, total: 0 };
    add.set(t.date, { done: c.done + (t.done ? 1 : 0), total: c.total + 1 });
  }
  return Object.fromEntries(Object.entries(days).map(([date, d]) => {
    const c = add.get(date);
    return [date, c ? { ...d, done: d.done + c.done, total: d.total + c.total } : { ...d }];
  }));
}
