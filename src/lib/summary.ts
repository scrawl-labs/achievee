import type { AppData, DateKey } from '../types';

export interface DaySummary {
  events: number;
  spent: number;
}

export function summarizeByDate(data: AppData): Record<DateKey, DaySummary> {
  const out: Record<DateKey, DaySummary> = {};
  const at = (d: DateKey) => (out[d] ??= { events: 0, spent: 0 });
  for (const e of data.events) at(e.date).events += 1;
  for (const x of data.expenses) at(x.date).spent += x.amount;
  return out;
}
