import type { DayEvent } from "./types";

/** Where a calendar event comes from. Pure helpers, no React, no I/O. */
export type EventSource = NonNullable<DayEvent["source"]>;

/** Events from before the `source` field existed (and the Google endpoint) carry none: that means google. */
export const eventSource = (e: Pick<DayEvent, "source">): EventSource => e.source ?? "google";

/**
 * One list out of several sources: sorted by date, start, then longer first (the order /api/events already returns),
 * duplicate ids dropped (first occurrence wins). Inputs are never modified; the sort is stable.
 */
export function mergeEvents(...lists: readonly (readonly DayEvent[])[]): DayEvent[] {
  const seen = new Set<string>();
  const unique = lists.flat().filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
  return [...unique].sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin || b.endMin - a.endMin);
}

/** One Google calendar as the "calendars to show" setting lists it. */
export type GoogleCalendar = { id: string; name: string; color: string };

/** Abuse guards for the stored list of hidden calendar ids (Google's calendarList returns at most 250). */
export const HIDDEN_CALENDARS_MAX = 250;
const CALENDAR_ID_MAX = 512;

/** Calendars minus the ones the person hid in Achievee. Order is kept; inputs are never modified. */
export function shownCalendars<C extends { id: string }>(calendars: readonly C[], hidden: readonly string[]): C[] {
  if (hidden.length === 0) return [...calendars];
  const off = new Set(hidden);
  return calendars.filter((c) => !off.has(c.id));
}

/** The body's `hiddenCalendars`: an array of non-empty ids, deduplicated. null for anything else (the route answers 400). */
export function parseHiddenCalendars(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > HIDDEN_CALENDARS_MAX) return null;
  if (!v.every((id) => typeof id === "string" && id.length > 0 && id.length <= CALENDAR_ID_MAX)) return null;
  return [...new Set(v as string[])];
}
