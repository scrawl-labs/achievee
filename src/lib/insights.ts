import { addDays } from "./dates";

/**
 * Patterns that show up in the user's own records. They describe what went together, never what caused what,
 * and a comparison is only reported when both groups have enough days behind them. Pure: no React, no I/O.
 */
export const MIN_DAYS_PER_GROUP = 5;
/** A mood difference smaller than this (on the 1..5 scale) is called "no big difference". */
export const MOOD_NOISE = 0.2;

export type MoodDay = { date: string; mood: number };
export type Group = { days: number; mood: number | null }; // mean mood over days that have a mood entry
export type Comparison = { yes: Group; no: Group; diff: number | null; enough: boolean };

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const group = (moods: readonly MoodDay[]): Group => ({ days: moods.length, mood: mean(moods.map((m) => m.mood)) });

/** Mood on days where `flag` holds against days where it does not (only days with a mood entry take part). */
function compare(moods: readonly MoodDay[], flag: (date: string) => boolean): Comparison {
  const yes = group(moods.filter((m) => flag(m.date))), no = group(moods.filter((m) => !flag(m.date)));
  const enough = yes.days >= MIN_DAYS_PER_GROUP && no.days >= MIN_DAYS_PER_GROUP;
  return { yes, no, enough, diff: enough && yes.mood !== null && no.mood !== null ? yes.mood - no.mood : null };
}

export function moodPatterns(
  moods: readonly MoodDay[], workoutDates: readonly string[], unneededDates: readonly string[],
): { exercise: Comparison; waste: Comparison } {
  const worked = new Set(workoutDates), waste = new Set(unneededDates);
  return { exercise: compare(moods, (d) => worked.has(d)), waste: compare(moods, (d) => waste.has(d)) };
}

/** Plain-words size of a mood difference. */
export const moodVerdict = (diff: number): "up" | "down" | "none" => (Math.abs(diff) < MOOD_NOISE ? "none" : diff > 0 ? "up" : "down");

export type BodyReading = { date: string; fat?: number };   // body fat in tenths of a percent
export type Interval = { from: string; to: string; days: number; fatChange: number; perWeek: number }; // fatChange in tenths

/**
 * Body-fat change between consecutive readings next to how often the user exercised in between (sessions per week).
 * Readings less than a week apart are skipped: too short for a weekly rate to mean anything. Newest interval first.
 */
export function bodyVsWorkout(readings: readonly BodyReading[], workoutDates: readonly string[], limit = 6): Interval[] {
  const withFat = readings.filter((r): r is { date: string; fat: number } => r.fat !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  const out: Interval[] = [];
  for (let i = 1; i < withFat.length; i++) {
    const a = withFat[i - 1], b = withFat[i];
    const days = Math.round((Date.parse(b.date) - Date.parse(a.date)) / 864e5);
    if (days < 7) continue;
    const sessions = workoutDates.filter((d) => d >= a.date && d < b.date).length;
    out.push({ from: a.date, to: b.date, days, fatChange: b.fat - a.fat, perWeek: (sessions / days) * 7 });
  }
  return out.slice(-limit).reverse();
}

/** The first day of the look-back window ending today (inclusive). */
export const windowStart = (today: string, days: number) => addDays(today, -(days - 1));
