import { addMonths } from "./dates";

/**
 * The "month" that contains `date` when a month starts on `startDay` (1..28).
 * `to` is exclusive. startDay 25 → 2026-10-10 falls in [2026-09-25, 2026-10-25).
 */
export function periodOf(date: string, startDay: number) {
  const d = Math.min(Math.max(1, Math.floor(startDay) || 1), 28);
  const monthFirst = `${date.slice(0, 7)}-01`;
  const base = Number(date.slice(8)) >= d ? monthFirst : addMonths(monthFirst, -1);
  const at = (iso: string) => `${iso.slice(0, 7)}-${String(d).padStart(2, "0")}`;
  return { from: at(base), to: at(addMonths(base, 1)) };
}
