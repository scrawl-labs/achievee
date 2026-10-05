import type { CalEvent, DateKey } from '../types';
import { addDays, parseDateKey, timeToMinutes } from './date';

export const SNAP = 15;
export const MIN_SPAN = 15;
/** 하루의 마지막 분(23:59). 종료 시간의 상한. */
export const DAY_END = 1439;

const pad = (n: number) => String(n).padStart(2, '0');

export function minutesToTime(m: number): string {
  const c = Math.max(0, Math.min(DAY_END, Math.round(m)));
  return `${pad(Math.floor(c / 60))}:${pad(c % 60)}`;
}

export function snapMinutes(m: number, step = SNAP): number {
  return Math.round(m / step) * step;
}

export function yToMinutes(y: number, pxPerHour: number): number {
  return (y / pxPerHour) * 60;
}

export interface Span {
  start: number;
  end: number;
}

/** 순서를 바로잡고, 최소 15분, 하루(0~DAY_END) 안으로 제한한다. */
export function clampSpan(start: number, end: number): Span {
  let s = Math.max(0, Math.min(start, end));
  let e = Math.min(DAY_END, Math.max(start, end));
  if (e - s < MIN_SPAN) {
    e = Math.min(DAY_END, s + MIN_SPAN);
    s = e - MIN_SPAN;
  }
  return { start: s, end: e };
}

/** 드래그로 만드는 범위: 양 끝을 15분에 맞춘다. */
export function dragSpan(anchor: number, current: number): Span {
  return clampSpan(snapMinutes(anchor), snapMinutes(current));
}

/** 길이를 유지한 채 delta분 이동하고, 하루 경계에서 멈춘다. */
export function moveSpan(span: Span, delta: number): Span {
  const dur = span.end - span.start;
  const start = Math.max(0, Math.min(DAY_END - dur, span.start + delta));
  return { start, end: start + dur };
}

export interface Placed {
  event: CalEvent;
  col: number;
  cols: number;
}

/** 겹치는 일정을 묶음으로 나눠 열 번호와 묶음의 열 수를 배정한다. */
export function layoutDay(events: CalEvent[]): Placed[] {
  const sorted = [...events].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start) || timeToMinutes(b.end) - timeToMinutes(a.end),
  );
  const out: Placed[] = [];
  let cluster: { event: CalEvent; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    for (const c of cluster) out.push({ event: c.event, col: c.col, cols: colEnds.length });
    cluster = [];
    colEnds = [];
    clusterEnd = -1;
  };

  for (const e of sorted) {
    const s = timeToMinutes(e.start);
    const en = timeToMinutes(e.end);
    if (cluster.length > 0 && s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= s);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(en);
    } else {
      colEnds[col] = en;
    }
    cluster.push({ event: e, col });
    clusterEnd = Math.max(clusterEnd, en);
  }
  flush();
  return out;
}

/** date가 속한 주의 7일. weekStartsOn: 0=일요일. */
export function weekDays(date: DateKey, weekStartsOn = 0): DateKey[] {
  const diff = (parseDateKey(date).getDay() - weekStartsOn + 7) % 7;
  const first = addDays(date, -diff);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

export function eventsByDate(events: CalEvent[]): Record<DateKey, CalEvent[]> {
  const out: Record<DateKey, CalEvent[]> = {};
  for (const e of events) (out[e.date] ??= []).push(e);
  for (const list of Object.values(out)) list.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}
