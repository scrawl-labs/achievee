import type { DayData, Stats } from "./types";

const LABELS = ["월", "화", "수", "목", "금", "토", "일"];

/** A day "counts" when it had tasks; a day is a success when ≥ 80% were done. */
export function computeStats(days: DayData[], today: string): Stats {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const withTasks = sorted.filter((d) => d.total > 0);
  const doneTotal = withTasks.reduce((s, d) => s + d.done, 0);
  const taskTotal = withTasks.reduce((s, d) => s + d.total, 0);
  const ok = (d: DayData) => d.total > 0 && d.done / d.total >= 0.8;

  let best = 0, run = 0;
  for (const d of withTasks) { run = ok(d) ? run + 1 : 0; best = Math.max(best, run); }
  // current streak: walk back from today (skip an unfinished today)
  let streak = 0;
  const past = withTasks.filter((d) => d.date <= today).reverse();
  for (const [i, d] of past.entries()) {
    if (ok(d)) streak++;
    else if (!(i === 0 && d.date === today)) break;
  }

  const wd = LABELS.map((label, i) => {
    const ds = withTasks.filter((d) => (new Date(d.date + "T00:00:00Z").getUTCDay() + 6) % 7 === i);
    const t = ds.reduce((s, d) => s + d.total, 0);
    return { label, rate: t ? ds.reduce((s, d) => s + d.done, 0) / t : 0 };
  });
  const bestDay = withTasks.reduce<DayData | null>((b, d) => (!b || d.done > b.done ? d : b), null);

  return { doneTotal, taskTotal, rate: taskTotal ? doneTotal / taskTotal : 0, streak, bestStreak: best, byWeekday: wd, bestDay };
}
