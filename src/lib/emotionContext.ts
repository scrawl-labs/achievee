import { FAMILIES, VALENCE, wordById } from "./emotions";
import { dow } from "./dates";

/**
 * What your feelings tend to go with, from your own records. Pure: no React, no I/O.
 * A comparison is only reported when both sides have enough days, and it only says what went together, never why.
 */
export const MIN_FAMILY_DAYS = 5;
/** A difference in share smaller than this (0..1) is not worth a sentence. */
export const MIN_GAP = 0.2;

export type EmoDay = { date: string; ids: string[] };
export type Context = { family: string; withDays: number; withRate: number; otherDays: number; otherRate: number };

const familiesOf = (d: EmoDay) => new Set(d.ids.map((i) => wordById(i)?.family).filter((f): f is string => !!f));

/** For each feeling family: how often a flagged day (exercise, an unneeded expense) happens on days with that family vs. other days. Biggest gap first. */
export function contexts(days: readonly EmoDay[], flagged: ReadonlySet<string>, max = 3): Context[] {
  const per = days.map((d) => ({ flag: flagged.has(d.date), fams: familiesOf(d) }));
  const out: Context[] = [];
  for (const f of FAMILIES) {
    const withF = per.filter((p) => p.fams.has(f.id)), other = per.filter((p) => !p.fams.has(f.id));
    if (withF.length < MIN_FAMILY_DAYS || other.length < MIN_FAMILY_DAYS) continue;
    const rate = (xs: typeof per) => xs.filter((p) => p.flag).length / xs.length;
    const c = { family: f.id, withDays: withF.length, withRate: rate(withF), otherDays: other.length, otherRate: rate(other) };
    if (Math.abs(c.withRate - c.otherRate) >= MIN_GAP) out.push(c);
  }
  return out.sort((a, b) => Math.abs(b.withRate - b.otherRate) - Math.abs(a.withRate - a.otherRate)).slice(0, max);
}

export type Portrait = {
  days: number; topFamily: string | null; topWords: string[];
  pleasant: number; unpleasant: number; between: number;   // share of picked words, whole percent
  lightest: number | null; heaviest: number | null;       // weekday (0 = Sunday) with the most pleasant / unpleasant average
};
export const MIN_PORTRAIT_DAYS = 3;
const MIN_WEEKDAY_DAYS = 3;

export function portrait(days: readonly EmoDay[]): Portrait {
  const word = new Map<string, number>(), fam = new Map<string, number>();
  let pos = 0, neg = 0, mid = 0;
  const wd: { sum: number; n: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
  for (const d of days) {
    const vs: number[] = [];
    for (const id of d.ids) {
      word.set(id, (word.get(id) ?? 0) + 1);
      const f = wordById(id)?.family;
      if (f) fam.set(f, (fam.get(f) ?? 0) + 1);
      const v = VALENCE[id] ?? 0;
      vs.push(v);
      if (v > 0) pos++; else if (v < 0) neg++; else mid++;
    }
    if (vs.length) { const w = wd[dow(d.date)]; w.sum += vs.reduce((a, b) => a + b, 0) / vs.length; w.n++; }
  }
  const total = pos + neg + mid || 1;
  const top = <T,>(m: Map<T, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
  const avgs = wd.map((w, i) => ({ i, a: w.n >= MIN_WEEKDAY_DAYS ? w.sum / w.n : null })).filter((x): x is { i: number; a: number } => x.a !== null);
  const enough = days.length >= MIN_PORTRAIT_DAYS;
  const hi = avgs.length >= 2 ? avgs.reduce((a, b) => (b.a > a.a ? b : a)) : null;
  const lo = avgs.length >= 2 ? avgs.reduce((a, b) => (b.a < a.a ? b : a)) : null;
  return {
    days: days.length,
    topFamily: enough ? top(fam, 1)[0] ?? null : null,
    topWords: enough ? top(word, 3) : [],
    pleasant: Math.round((pos / total) * 100), unpleasant: Math.round((neg / total) * 100), between: Math.round((mid / total) * 100),
    lightest: hi && lo && hi.a - lo.a >= 0.3 ? hi.i : null, heaviest: hi && lo && hi.a - lo.a >= 0.3 ? lo.i : null,
  };
}

export type MonthSummary = { month: string; days: number; portrait: Portrait; prevPleasant: number | null; newWords: string[] };

const prevMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`; };

/** "This month's me": the portrait of one month (YYYY-MM), how its pleasant share moved from the month before, and words used for the first time. */
export function monthSummary(all: readonly EmoDay[], month: string): MonthSummary {
  const inMonth = all.filter((d) => d.date.startsWith(month));
  const prev = all.filter((d) => d.date.startsWith(prevMonth(month)));
  const first = new Map<string, string>();
  for (const d of [...all].sort((a, b) => a.date.localeCompare(b.date))) for (const id of d.ids) if (!first.has(id)) first.set(id, d.date);
  return {
    month, days: inMonth.length, portrait: portrait(inMonth),
    prevPleasant: prev.length >= MIN_PORTRAIT_DAYS ? portrait(prev).pleasant : null,
    newWords: [...first.entries()].filter(([, date]) => date.startsWith(month)).map(([id]) => id),
  };
}

export type Tally = { family: string; days: number; exercise: number; unneeded: number; saved: number };

/** While there are too few days to compare, just count: on the days a feeling family showed up, how many had exercise, an unneeded expense, saving. Most frequent first. */
export function tallies(
  days: readonly EmoDay[], flags: { exercise: ReadonlySet<string>; unneeded: ReadonlySet<string>; saved: ReadonlySet<string> }, max = 3, minDays = 2,
): Tally[] {
  const out: Tally[] = [];
  for (const f of FAMILIES) {
    const withF = days.filter((d) => familiesOf(d).has(f.id));
    if (withF.length < minDays) continue;
    const n = (set: ReadonlySet<string>) => withF.filter((d) => set.has(d.date)).length;
    out.push({ family: f.id, days: withF.length, exercise: n(flags.exercise), unneeded: n(flags.unneeded), saved: n(flags.saved) });
  }
  return out.sort((a, b) => b.days - a.days).slice(0, max);
}
