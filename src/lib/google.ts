import type { DayData, DayEvent } from "./types";
import { dayStart, localDate, localTime } from "./tz";

async function g<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Google API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

function range(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { first: `${ym}-01`, last: `${ym}-${pad(last)}`, count: last };
}

/**
 * Per-day counts for a month.
 *  - Google Calendar events have no "done" state, so they are only counted as `events`.
 *  - Completion comes from Google Tasks (due date → day; falls back to completion date).
 */
export async function fetchMonth(ym: string, token: string, tz: string): Promise<Record<string, DayData>> {
  const { first, last, count } = range(ym);
  const days: Record<string, DayData> = {};
  for (let d = 1; d <= count; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    days[date] = { date, done: 0, total: 0, events: 0, tasks: [], eventList: [] };
  }

  const loadTasks = async () => {
  const lists = await g<{ items?: { id: string }[] }>(
    "https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=100", token);
  await Promise.all((lists.items ?? []).map(async (l) => {
    let pageToken = "";
    do {
      const q = new URLSearchParams({
        showCompleted: "true", showHidden: "true", maxResults: "100",
        dueMin: `${first}T00:00:00Z`, dueMax: `${last}T23:59:59Z`,
      });
      if (pageToken) q.set("pageToken", pageToken);
      const r = await g<{ items?: { title?: string; due?: string; status: string; completed?: string }[]; nextPageToken?: string }>(
        `https://tasks.googleapis.com/tasks/v1/lists/${l.id}/tasks?${q}`, token);
      for (const t of r.items ?? []) {
        const date = (t.due ?? t.completed ?? "").slice(0, 10);
        const day = days[date];
        if (!day) continue;
        const done = t.status === "completed";
        day.total++;
        if (done) day.done++;
        day.tasks.push({ title: t.title?.trim() ?? "", done });
      }
      pageToken = r.nextPageToken ?? "";
    } while (pageToken);
  }));
  };

  const loadEvents = async () => {
  let pageToken = "";
  do {
    const q = new URLSearchParams({
      singleEvents: "true", maxResults: "250",
      timeMin: new Date(dayStart(first, tz)).toISOString(),
      timeMax: new Date(dayStart(`${ym}-${String(count).padStart(2, "0")}`, tz) + 864e5).toISOString(),
    });
    if (pageToken) q.set("pageToken", pageToken);
    const r = await g<{ items?: { summary?: string; start?: { date?: string; dateTime?: string } }[]; nextPageToken?: string }>(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`, token);
    for (const e of r.items ?? []) {
      const date = e.start?.date ?? (e.start?.dateTime ? localDate(Date.parse(e.start.dateTime), tz) : "");
      if (!days[date]) continue;
      days[date].events++;
      days[date].eventList.push({
        title: e.summary?.trim() ?? "",
        time: e.start?.dateTime ? localTime(Date.parse(e.start.dateTime), tz) : null,
      });
    }
    pageToken = r.nextPageToken ?? "";
  } while (pageToken);
  };

  await Promise.all([loadTasks(), loadEvents()]);

  for (const d of Object.values(days)) {
    d.tasks.sort((a, b) => Number(a.done) - Number(b.done)); // unfinished first
    d.eventList.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  }
  return days;
}

/**
 * Events of all visible calendars between `from` and `to` (exclusive), split into one segment per day
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
  await Promise.all((cals.items ?? []).filter((c) => c.selected !== false).map(async (c) => {
    const q = new URLSearchParams({
      singleEvents: "true", orderBy: "startTime", maxResults: "2500",
      timeMin: new Date(rangeStart).toISOString(), timeMax: new Date(rangeEnd).toISOString(),
    });
    const r = await g<{ items?: {
      id: string; status?: string; summary?: string; htmlLink?: string; location?: string;
      start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string };
      attendees?: { self?: boolean; responseStatus?: string }[];
    }[] }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events?${q}`, token);
    for (const e of r.items ?? []) {
      if (e.status === "cancelled" || e.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
      const base = {
        title: e.summary?.trim() ?? "", calendar: c.summaryOverride ?? c.summary,
        color: c.backgroundColor ?? "#8fb8ff", link: e.htmlLink, location: e.location,
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
