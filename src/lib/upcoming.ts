import type { DayEvent } from "./types";
import type { Key } from "./i18n";
import { eventSource } from "./calendarSources";

/** The "Upcoming" strip on the Log tab: the next two weeks of events, own plans first. Pure helpers, no React, no I/O. */
export const UPCOMING_DAYS = 14;
export const UPCOMING_MAX = 5;

const DAY_MS = 864e5;
/** Whole calendar days from `today` to `date` (both YYYY-MM-DD). */
export const daysUntil = (date: string, today: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);

/** The badge: "Today", "Tomorrow", then "D-n". */
export function ddayLabel(date: string, today: string): { key: Key; n?: number } {
  const n = daysUntil(date, today);
  return n <= 0 ? { key: "up.today" } : n === 1 ? { key: "up.tomorrow" } : { key: "up.dday", n };
}

/**
 * One event, not one segment: /api/events splits a Google event into a segment per day ("cal:event:2026-11-29"),
 * so a 3-day trip or a party past midnight would otherwise fill three rows. Own events are one day each ("n12").
 */
export const eventKey = (e: Pick<DayEvent, "id" | "source">) => (eventSource(e) === "native" ? e.id : e.id.replace(/:\d{4}-\d{2}-\d{2}$/, ""));

export type Upcoming = {
  rows: DayEvent[];   // what the strip lists, in time order
  more: number;       // listable events left out by the row cap
  google: number;     // Google events left out (counted, not listed, once there are too many to list them all)
};

/**
 * What the strip shows from the events in [today, today + days). Each event once (its first day in range), timed events of
 * today that already ended are dropped. If everything fits in `max` rows, everything is listed; otherwise only own events are
 * listed and Google ones become a count, so a booked round of golf is never pushed out by a week of work meetings
 * (with no own events at all, the nearest Google ones are listed instead of an empty strip).
 */
export function selectUpcoming(events: readonly DayEvent[], today: string, nowMin: number, days = UPCOMING_DAYS, max = UPCOMING_MAX): Upcoming {
  const end = new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
  const seen = new Set<string>();
  const items = [...events]
    .filter((e) => e.date >= today && e.date < end)
    .sort((a, b) => a.date.localeCompare(b.date) || Number(b.allDay) - Number(a.allDay) || a.startMin - b.startMin || b.endMin - a.endMin)
    .filter((e) => {
      const k = eventKey(e);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .filter((e) => !(e.date === today && !e.allDay && e.endMin <= nowMin));
  if (items.length <= max) return { rows: items, more: 0, google: 0 };
  const own = items.filter((e) => eventSource(e) === "native");
  if (own.length === 0) return { rows: items.slice(0, max), more: items.length - max, google: 0 }; // nothing of their own: the nearest Google ones
  const rows = own.slice(0, max);
  return { rows, more: own.length - rows.length, google: items.length - own.length };
}
