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
