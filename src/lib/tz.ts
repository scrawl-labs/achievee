/** Timezone helpers: the server computes day boundaries in the viewer's timezone (sent by the client). */
export const DEFAULT_TZ = process.env.APP_TIMEZONE ?? "Asia/Seoul";

export function safeTz(tz?: string | null): string {
  if (!tz) return DEFAULT_TZ;
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return tz; } catch { return DEFAULT_TZ; }
}

const partsFmt = new Map<string, Intl.DateTimeFormat>();
function offsetMs(t: number, tz: string): number {
  let f = partsFmt.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    partsFmt.set(tz, f);
  }
  const p = f.formatToParts(new Date(t));
  const g = (k: string) => Number(p.find((x) => x.type === k)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - Math.floor(t / 1000) * 1000;
}

/** Epoch ms of 00:00 on `date` (YYYY-MM-DD) in `tz`. */
export function dayStart(date: string, tz: string): number {
  const utc = Date.parse(`${date}T00:00:00Z`);
  const guess = utc - offsetMs(utc, tz);
  return utc - offsetMs(guess, tz);
}

const dayFmts = new Map<string, Intl.DateTimeFormat>();
/** YYYY-MM-DD of an instant in `tz`. */
export function localDate(ms: number, tz: string): string {
  let f = dayFmts.get(tz);
  if (!f) { f = new Intl.DateTimeFormat("en-CA", { timeZone: tz }); dayFmts.set(tz, f); }
  return f.format(new Date(ms));
}

/** HH:mm of an instant in `tz`. */
export function localTime(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ms));
}
