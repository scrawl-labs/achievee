import type { DayData, DayEvent } from "./types";

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

export function demoDay(date: string): DayEvent[] {
  const seed = date.split("-").reduce((a, n) => a + Number(n), 0);
  const mk = (i: number, title: string, calendar: string, color: string, h: number, m: number, len: number): DayEvent =>
    ({ id: `d${i}`, title, calendar, color, allDay: false, startMin: h * 60 + m, endMin: h * 60 + m + len });
  const list = [
    mk(1, "출근 이동", "개인", "#7986cb", 7, 0, 60),
    mk(2, "팀 미팅", "직장", "#8e24aa", 10, 0, 60),
    mk(3, "테스트 케이스 작성", "직장", "#039be5", 10, 30, 120),
    mk(4, "점심", "개인", "#33b679", 12, 30, 60),
    mk(5, "코드 리뷰", "직장", "#8e24aa", 15, 0, 60),
    mk(6, "코드 리뷰 2", "직장", "#039be5", 15, 30, 60),
    mk(7, "운동", "개인", "#f6bf26", 19, 0, 90),
  ];
  const events = list.filter((_, i) => (i + seed) % 4 !== 0);
  if (seed % 3 === 0) events.unshift({ id: "ad", title: "휴가", calendar: "개인", color: "#e67c73", allDay: true, startMin: 0, endMin: 1440 });
  return events;
}
