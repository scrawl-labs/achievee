export type DayData = { date: string; done: number; total: number; events: number };
export type MonthData = { ym: string; days: Record<string, DayData>; demo: boolean };
export type Stats = {
  doneTotal: number; taskTotal: number; rate: number;
  streak: number; bestStreak: number;
  byWeekday: { label: string; rate: number }[];
  bestDay: DayData | null;
};
