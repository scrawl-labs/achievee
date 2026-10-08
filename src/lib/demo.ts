import type { DayData } from "./types";

const TASKS = ["운동 30분", "영어 단어 50개", "이메일 정리", "장보기", "독서 20쪽", "설거지", "보고서 초안", "산책", "빨래", "스터디 자료 읽기"];
const EVENTS: [string, string][] = [["팀 미팅", "10:00"], ["점심 약속", "12:30"], ["병원", "15:00"], ["저녁 약속", "19:00"]];

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
    const tasks = Array.from({ length: total }, (_, i) => ({ title: TASKS[(seed + i * 3) % TASKS.length], done: i < done }));
    const events = seed % 4;
    days[date] = { date, done, total, events, tasks, eventList: EVENTS.slice(0, events).map(([title, time]) => ({ title, time })) };
  }
  return days;
}
