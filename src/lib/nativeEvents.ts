import { isYmd } from "./dates";
import { fail, isGoalId, isRecord, parseText, type Parsed } from "./goals";
import type { DayData, DayEvent } from "./types";

/** Own calendar events: created in Achievee, stored here, shown mixed with the Google ones. Pure helpers, no React, no I/O. */
export type NativeEventRow = { id: number; date: string; startMin: number; endMin: number; title: string };
export type NativeEventCreate = { date: string; startMin: number; endMin: number; title: string };
export type NativeEventPatch = { id: number; title?: string; date?: string; startMin?: number; endMin?: number };

export const NATIVE_CALENDAR = "Achievee";
export const NATIVE_COLOR = "#7c8cff";
/** Abuse guard only: more own events than this on one (user, date) is rejected with 400. */
export const NATIVE_EVENT_HARD_LIMIT = 100;
export const MIN_EVENT_MINUTES = 15;
const DAY_MIN = 1440;

const isMinute = (v: unknown, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
/** A start before the end, at least MIN_EVENT_MINUTES long, inside one day. */
const validSpan = (start: unknown, end: unknown): start is number =>
  isMinute(start, DAY_MIN - MIN_EVENT_MINUTES) && isMinute(end, DAY_MIN) && (end as number) - start >= MIN_EVENT_MINUTES;

export function parseNativeCreate(b: unknown): Parsed<NativeEventCreate> {
  if (!isRecord(b)) return fail("bad input");
  if (!isYmd(b.date)) return fail("bad date");
  if (!validSpan(b.startMin, b.endMin)) return fail("bad time");
  const title = parseText(b.title);
  return title.ok ? { ok: true, value: { date: b.date, startMin: b.startMin, endMin: b.endMin as number, title: title.value } } : title;
}

export function parseNativePatch(b: unknown): Parsed<NativeEventPatch> {
  if (!isRecord(b) || !isGoalId(b.id)) return fail("bad input");
  let value: NativeEventPatch = { id: b.id };
  if (b.title !== undefined) {
    const t = parseText(b.title);
    if (!t.ok) return t;
    value = { ...value, title: t.value };
  }
  if (b.date !== undefined) {
    if (!isYmd(b.date)) return fail("bad date");
    value = { ...value, date: b.date };
  }
  if (b.startMin !== undefined || b.endMin !== undefined) { // a time change always carries both ends
    if (!validSpan(b.startMin, b.endMin)) return fail("bad time");
    value = { ...value, startMin: b.startMin as number, endMin: b.endMin as number };
  }
  return Object.keys(value).length > 1 ? { ok: true, value } : fail("nothing to update");
}

export function parseNativeId(raw: string | null): Parsed<number> {
  const id = raw && /^\d+$/.test(raw) ? Number(raw) : NaN;
  return isGoalId(id) ? { ok: true, value: id } : fail("bad id");
}

/** The shape every calendar view already draws. The id keeps own events apart from Google ids. */
export const toDayEvent = (r: NativeEventRow): DayEvent => ({
  id: `n${r.id}`, date: r.date, title: r.title, calendar: NATIVE_CALENDAR, color: NATIVE_COLOR,
  allDay: false, startMin: r.startMin, endMin: r.endMin, source: "native",
});

/** "n12" -> 12; anything else (a Google id) -> null. */
export const nativeIdOf = (e: Pick<DayEvent, "id" | "source">): number | null => {
  const m = e.source === "native" ? /^n(\d+)$/.exec(e.id) : null;
  return m ? Number(m[1]) : null;
};

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Adds own events to the month's per-day event count and list. Pure: returns new day objects, ignores rows whose date
 * is not one of the given days, and keeps the list in time order (all-day entries, which have no time, first).
 */
export function mergeNativeIntoMonth(days: Readonly<Record<string, DayData>>, rows: readonly NativeEventRow[]): Record<string, DayData> {
  const add = new Map<string, NativeEventRow[]>();
  for (const r of rows) {
    if (!Object.prototype.hasOwnProperty.call(days, r.date)) continue;
    add.set(r.date, [...(add.get(r.date) ?? []), r]);
  }
  return Object.fromEntries(Object.entries(days).map(([date, d]) => {
    const extra = add.get(date);
    if (!extra) return [date, { ...d }];
    const eventList = [...d.eventList, ...extra.map((r) => ({ title: r.title, time: hhmm(r.startMin) }))]
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    return [date, { ...d, events: d.events + extra.length, eventList }];
  }));
}
