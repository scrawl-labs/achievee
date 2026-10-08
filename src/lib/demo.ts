import type { DayData } from "./types";

// Deterministic fake data so the UI is usable before Google OAuth is configured.
export function demoMonth(ym: string): Record<string, DayData> {
  const [y, m] = ym.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days: Record<string, DayData> = {};
  for (let d = 1; d <= count; d++) {
    const date = `${ym}-${String(d).padStart(2, "0")}`;
    const seed = (y * 372 + m * 31 + d) * 2654435761 % 1000;
    const total = (seed % 6) + 1;
    const done = Math.min(total, Math.round(total * ((seed % 7) / 6)));
    days[date] = { date, done, total, events: seed % 4 };
  }
  return days;
}
