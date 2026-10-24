import { addMonths } from "./dates";

/** A pay day that differs from the usual one in a given month: "2026-10" → 23 means the period that starts in October starts on the 23rd. */
export type StartOverrides = Record<string, number>;

const clampDay = (n: number) => Math.min(Math.max(1, Math.floor(n) || 1), 28);
const shift = (ym: string, n: number) => addMonths(`${ym}-01`, n).slice(0, 7);

/** The date the period that starts in month `ym` (YYYY-MM) begins on. */
export const periodStart = (ym: string, startDay: number, overrides?: StartOverrides) =>
  `${ym}-${String(clampDay(overrides?.[ym] ?? startDay)).padStart(2, "0")}`;

/**
 * The "month" that contains `date` when a month starts on `startDay` (1..28), unless a month has its own start day
 * (the salary came in early because the 25th was a weekend or a holiday). `to` is exclusive.
 * startDay 25 → 2026-10-10 falls in [2026-09-25, 2026-10-25).
 */
export function periodOf(date: string, startDay: number, overrides?: StartOverrides) {
  const ym = date.slice(0, 7);
  const here = periodStart(ym, startDay, overrides);
  return date >= here
    ? { from: here, to: periodStart(shift(ym, 1), startDay, overrides) }
    : { from: periodStart(shift(ym, -1), startDay, overrides), to: here };
}

/** Keep only well-formed overrides: YYYY-MM keys with a day 1..28. */
export function cleanOverrides(raw: unknown): StartOverrides {
  const out: StartOverrides = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(k) && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 28) out[k] = v as number;
  }
  return out;
}
