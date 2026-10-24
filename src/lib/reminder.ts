import type { Locale } from "./i18n";

/** The evening nudge to pick a feeling word. Pure: no React, no I/O. */
export const REMINDER_HOUR = 21;

/** What the viewer's clock says at `now` in time zone `tz` (falls back to UTC for an unknown zone). */
export function localDateHour(now: Date, tz: string): { date: string; hour: number } {
  const parts = (zone: string) => {
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
    const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
  };
  try { return parts(tz); } catch { return parts("UTC"); }
}

/** A subscription is due when it is 21:00-21:59 where the person is and nothing was sent for that local date yet. */
export function dueDate(sub: { tz: string; lastSent: string }, now: Date): string | null {
  const { date, hour } = localDateHour(now, sub.tz);
  return hour === REMINDER_HOUR && sub.lastSent !== date ? date : null;
}

export const REMINDER_TEXT: Record<Locale, { title: string; body: string }> = {
  ko: { title: "오늘의 마음", body: "오늘은 어떤 마음이었나요? 한 단어로 남겨 보세요." },
  en: { title: "How did today feel?", body: "Pick the word that fits. It takes a minute." },
  ja: { title: "今日の気持ち", body: "今日はどんな気持ちでしたか？ 一言で残してみましょう。" },
  es: { title: "Tu día en una palabra", body: "¿Cómo te sentiste hoy? Elige la palabra que mejor lo cuenta." },
  zh: { title: "今天的心情", body: "今天是什麼心情？用一個詞記下來吧。" },
};
