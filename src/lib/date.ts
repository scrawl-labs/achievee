import type { DateKey } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** month는 0부터. 일요일 시작, 7칸씩 끊은 주 배열. 달 밖의 칸은 null. */
export function monthGrid(year: number, month: number): (DateKey | null)[][] {
  const lead = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (DateKey | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(toDateKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateEventTimes(start: string, end: string): string | null {
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return '시작과 끝 시간을 입력해 주세요';
  if (timeToMinutes(end) <= timeToMinutes(start)) return '끝나는 시간이 시작보다 늦어야 해요';
  return null;
}

interface Span {
  start: string;
  end: string;
}

export function hourRange(h: number): Span {
  return { start: `${pad(h)}:00`, end: h === 23 ? '23:59' : `${pad(h + 1)}:00` };
}
