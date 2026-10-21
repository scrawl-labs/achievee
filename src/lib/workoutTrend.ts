import { addDays, mondayOf } from "./dates";
import { tally, type WorkoutKind, type WorkoutRow } from "./workout";

/** The last weeks of exercise against the weekly goal, counted from the first week with a logged workout. Pure. */
export type WeekStat = { week: string; sessions: number; minutes: number; met: boolean };

/** Mondays of the last `n` weeks ending with the week that contains `anchor`, oldest first. */
export const weeksBack = (anchor: string, n: number): string[] => {
  const last = mondayOf(anchor);
  return Array.from({ length: n }, (_, i) => addDays(last, -7 * (n - 1 - i)));
};

export function workoutTrend(rows: readonly WorkoutRow[], anchor: string, n: number, goal: number) {
  const all: WeekStat[] = weeksBack(anchor, n).map((week) => {
    const t = tally([...rows], week, addDays(week, 7));
    return { week, sessions: t.sessions, minutes: t.minutes, met: t.sessions >= goal };
  });
  // Weeks before the first logged workout are weeks before the user started tracking, not weeks off: leave them out of the bars and the averages.
  const start = all.findIndex((w) => w.sessions > 0);
  const weeks = start < 0 ? all : all.slice(start);
  const from = weeks[0]?.week ?? anchor, to = addDays(weeks[weeks.length - 1]?.week ?? anchor, 7);
  const inRange = rows.filter((r) => r.date >= from && r.date < to);
  const byKind = new Map<WorkoutKind, number>();
  for (const r of inRange) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  const top = [...byKind.entries()].sort((a, b) => b[1] - a[1])[0];
  const sessions = weeks.reduce((s, w) => s + w.sessions, 0), minutes = weeks.reduce((s, w) => s + w.minutes, 0);
  return {
    weeks,
    metWeeks: weeks.filter((w) => w.met).length,
    avgSessions: weeks.length ? sessions / weeks.length : 0,
    avgMinutes: sessions ? Math.round(minutes / sessions) : 0,
    topKind: top ? top[0] : null,
    max: Math.max(goal, ...weeks.map((w) => w.sessions)),
  };
}
