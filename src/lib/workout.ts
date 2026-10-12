export const WORKOUT_KINDS = ["run", "walk", "gym", "yoga", "bike", "swim", "hike", "other"] as const;
export type WorkoutKind = (typeof WORKOUT_KINDS)[number];
export type WorkoutRow = { id: number; date: string; kind: WorkoutKind; minutes: number; memo: string };
export const DEFAULT_GOAL = 3; // sessions per week

/** Sessions and minutes of the rows that fall in [from, to). */
export function tally(rows: WorkoutRow[], from: string, to: string) {
  const inRange = rows.filter((r) => r.date >= from && r.date < to);
  return { sessions: inRange.length, minutes: inRange.reduce((s, r) => s + r.minutes, 0), days: new Set(inRange.map((r) => r.date)) };
}
