import { addMonths, monthStart } from "./dates";
import { browserTz } from "./clientTime";

/** Same URL App uses for the month, so useApi's cache is shared (the month is fetched once, not once per view). */
export const monthUrl = (ym: string) => `/api/month?ym=${ym}&tz=${encodeURIComponent(browserTz())}`;

/** Own to-dos of a range; `to` is inclusive (the API allows 62 days at most). */
export const todosRangeUrl = (from: string, to: string) => `/api/todos?from=${from}&to=${to}`;

/** The YYYY-MM of every month the inclusive range [from, to] touches, oldest first. An inverted range yields just the start month. */
export function monthsInRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let m = monthStart(from); (m <= to || out.length === 0) && out.length < 3; m = addMonths(m, 1)) out.push(m.slice(0, 7));
  return out;
}
