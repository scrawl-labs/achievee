import type { DayData, DayEvent } from "./types";
import { fetchAllPages } from "./paginate";
import { dayStart } from "./tz";

async function g<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function range(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10); // 1st of the following month (exclusive end)
  return { first: `${ym}-01`, last: `${ym}-${pad(last)}`, next, count: last };
}

/** Every day of the month with nothing in it (also the answer when Google access is revoked). */
export function emptyMonthDays(ym: string): Record<string, DayData> {
  const days: Record<string, DayData> = {};
  for (let d = 1; d <= range(ym).count; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    days[date] = { date, done: 0, total: 0, events: 0, tasks: [], eventList: [] };
  }
  return days;
}

type TaskRow = { title?: string; due?: string; status: string; completed?: string };

async function fetchTasks(first: string, last: string, token: string): Promise<TaskRow[]> {
  const lists = await fetchAllPages<{ id: string }>((pageToken) => {
    const q = new URLSearchParams({ maxResults: "100" });
    if (pageToken) q.set("pageToken", pageToken);
    return g(`https://tasks.googleapis.com/tasks/v1/users/@me/lists?${q}`, token);
  });
  const perList = await Promise.all(lists.map((l) => fetchAllPages<TaskRow>((pageToken) => {
    const q = new URLSearchParams({
      showCompleted: "true", showHidden: "true", maxResults: "100",
      dueMin: `${first}T00:00:00Z`, dueMax: `${last}T23:59:59Z`,
    });
    if (pageToken) q.set("pageToken", pageToken);
    return g(`https://tasks.googleapis.com/tasks/v1/lists/${l.id}/tasks?${q}`, token);
  })));
  return perList.flat();
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Per-day counts for a month.
 *  - Google Calendar events have no "done" state, so they are only counted as `events`.
 *    Events come from fetchRange so the calendar badges always match the day/week/month views.
 *  - Completion comes from Google Tasks (due date → day; falls back to completion date).
 */
export async function fetchMonth(ym: string, token: string, tz: string): Promise<Record<string, DayData>> {
  const { first, last, next } = range(ym);
  const days = emptyMonthDays(ym);

  const [tasks, events] = await Promise.all([fetchTasks(first, last, token), fetchRange(first, next, token, tz)]);

  for (const t of tasks) {
    const day = days[(t.due ?? t.completed ?? "").slice(0, 10)];
    if (!day) continue;
    const done = t.status === "completed";
    day.total++;
    if (done) day.done++;
    day.tasks.push({ title: t.title?.trim() ?? "", done });
  }
  for (const e of events) {
    const day = days[e.date];
    if (!day) continue;
    day.events++;
    day.eventList.push({ title: e.title, time: e.allDay ? null : hhmm(e.startMin) });
  }

  for (const d of Object.values(days)) {
    d.tasks.sort((a, b) => Number(a.done) - Number(b.done)); // unfinished first
    d.eventList.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  }
  return days;
}

type EventStatusFields = { status?: string; attendees?: { self?: boolean; responseStatus?: string }[] };

/** Single rule for "does this event count": not cancelled and not declined by me. */
export function isActiveEvent(e: EventStatusFields): boolean {
  return e.status !== "cancelled" && !e.attendees?.some((a) => a.self && a.responseStatus === "declined");
}

/**
 * Events of the calendars checked in Google Calendar's sidebar between `from` and `to` (exclusive), split into one segment per day
 * and positioned in minutes from 00:00 (KST) so views can lay them out directly.
 */
export async function fetchRange(from: string, to: string, token: string, tz: string): Promise<DayEvent[]> {
  const kst = (d: string) => dayStart(d, tz);
  const rangeStart = kst(from), rangeEnd = kst(to);
  const days: string[] = [];
  for (let d = from; d < to && days.length < 62; d = new Date(Date.parse(`${d}T00:00:00Z`) + 864e5).toISOString().slice(0, 10)) days.push(d);
  const cals = await g<{ items?: { id: string; summary: string; summaryOverride?: string; backgroundColor?: string; selected?: boolean }[] }>(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250", token);
  const out: DayEvent[] = [];
  // calendarList only sends `selected` when it is true (absent = unchecked), so require === true
  await Promise.all((cals.items ?? []).filter((c) => c.selected === true).map(async (c) => {
    const q = new URLSearchParams({
      singleEvents: "true", orderBy: "startTime", maxResults: "2500",
      timeMin: new Date(rangeStart).toISOString(), timeMax: new Date(rangeEnd).toISOString(),
    });
    const r = await g<{ items?: {
      id: string; status?: string; summary?: string; htmlLink?: string; location?: string;
      start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
      attendees?: { self?: boolean; responseStatus?: string; resource?: boolean }[]; hangoutLink?: string; conferenceData?: unknown;
    }[] }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events?${q}`, token);
    for (const e of r.items ?? []) {
      if (!isActiveEvent(e)) continue;
      const base = {
        title: e.summary?.trim() ?? "", calendar: c.summaryOverride ?? c.summary,
        color: c.backgroundColor ?? "#8fb8ff", link: e.htmlLink, location: e.location,
        meeting: (e.attendees?.filter((a) => !a.resource).length ?? 0) > 1 || !!e.hangoutLink || !!e.conferenceData,
      };
      if (!e.start?.dateTime) { // all-day: end.date is exclusive
        for (const d of days) if (d >= e.start!.date! && d < (e.end?.date ?? e.start!.date!) ) out.push({ ...base, id: `${c.id}:${e.id}:${d}`, date: d, allDay: true, startMin: 0, endMin: 1440 });
        continue;
      }
      const s0 = new Date(e.start.dateTime).getTime();
      const e0 = Math.max(new Date(e.end?.dateTime ?? e.start.dateTime).getTime(), s0 + 15 * 60000);
      for (const d of days) {
        const ds = kst(d), de = kst(new Date(Date.parse(`${d}T00:00:00Z`) + 864e5).toISOString().slice(0, 10));
        if (e0 <= ds || s0 >= de) continue;
        out.push({ ...base, id: `${c.id}:${e.id}:${d}`, date: d, allDay: false,
          startMin: Math.round((Math.max(s0, ds) - ds) / 60000), endMin: Math.round((Math.min(e0, de) - ds) / 60000) });
      }
    }
  }));
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin || b.endMin - a.endMin);
}
