export type TaskItem = { title: string; done: boolean };
export type EventItem = { title: string; time: string }; // time: "HH:mm" or "종일"
export type DayData = { date: string; done: number; total: number; events: number; tasks: TaskItem[]; eventList: EventItem[] };
export type MonthData = { ym: string; days: Record<string, DayData>; demo: boolean };
export type Stats = {
  doneTotal: number; taskTotal: number; rate: number;
  streak: number; bestStreak: number;
  byWeekday: { label: string; rate: number }[];
  bestDay: DayData | null;
};

export type DayEvent = {
  id: string; date: string; title: string; calendar: string; color: string; link?: string; location?: string;
  allDay: boolean; startMin: number; endMin: number; // minutes from 00:00, clamped to the day
};
