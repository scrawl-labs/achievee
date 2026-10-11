import type { DayEvent } from "./types";
import { dow } from "./dates";

/** Working window the focus time is measured in (minutes from 00:00) and the shortest free gap that counts as focus time. */
export const WORK_START = 9 * 60, WORK_END = 18 * 60, MIN_FOCUS = 60;

export type DayFocus = {
  date: string;
  meetingMin: number;   // time in meetings (union, so overlapping meetings are counted once)
  otherMin: number;     // other busy time inside the working window
  focusMin: number;     // free gaps of at least MIN_FOCUS inside the working window
  longestMin: number;   // the longest free gap
  meetings: number;
};

type Span = [number, number];
const union = (spans: Span[]): Span[] => {
  const out: Span[] = [];
  for (const [s, e] of [...spans].sort((a, b) => a[0] - b[0])) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e); else out.push([s, e]);
  }
  return out;
};
const total = (spans: Span[]) => spans.reduce((n, [s, e]) => n + (e - s), 0);
const clamp = (spans: Span[]): Span[] => spans.map(([s, e]): Span => [Math.max(s, WORK_START), Math.min(e, WORK_END)]).filter(([s, e]) => e > s);

/**
 * Meeting and focus time per weekday. Only weekdays that have at least one timed event are measured
 * (an empty weekday is usually a day off and would inflate the focus time). All-day events are ignored.
 */
export function focusByDay(events: DayEvent[]): DayFocus[] {
  const byDate = new Map<string, DayEvent[]>();
  for (const e of events) {
    if (e.allDay) continue;
    const d = dow(e.date);
    if (d === 0 || d === 6) continue;
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  }
  return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => {
    const meet = union(clamp(list.filter((e) => e.meeting).map((e): Span => [e.startMin, e.endMin])));
    const busy = union(clamp(list.map((e): Span => [e.startMin, e.endMin])));
    const gaps: number[] = [];
    let at = WORK_START;
    for (const [s, e] of busy) { if (s > at) gaps.push(s - at); at = Math.max(at, e); }
    if (at < WORK_END) gaps.push(WORK_END - at);
    const meetingMin = total(meet);
    return {
      date, meetingMin, otherMin: total(busy) - meetingMin,
      focusMin: gaps.filter((g) => g >= MIN_FOCUS).reduce((n, g) => n + g, 0),
      longestMin: gaps.length ? Math.max(...gaps) : 0,
      meetings: list.filter((e) => e.meeting).length,
    };
  });
}
