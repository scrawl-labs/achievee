import { describe, expect, it } from 'vitest';
import type { CalEvent } from '../types';
import {
  clampSpan,
  dragSpan,
  eventsByDate,
  layoutDay,
  minutesToTime,
  moveSpan,
  snapMinutes,
  weekDays,
  yToMinutes,
} from './timegrid';

const ev = (id: string, start: string, end: string, date = '2026-10-05'): CalEvent => ({
  id,
  title: id,
  date,
  start,
  end,
});

describe('minutesToTime / snapMinutes / yToMinutes', () => {
  it('분을 HH:mm으로 바꾸고 하루 범위로 제한한다', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(75)).toBe('01:15');
    expect(minutesToTime(1440)).toBe('23:59');
    expect(minutesToTime(-30)).toBe('00:00');
  });
  it('15분 단위로 반올림한다', () => {
    expect(snapMinutes(7)).toBe(0);
    expect(snapMinutes(8)).toBe(15);
    expect(snapMinutes(52)).toBe(45);
  });
  it('y 좌표를 분으로 바꾼다', () => {
    expect(yToMinutes(48, 48)).toBe(60);
    expect(yToMinutes(24, 48)).toBe(30);
  });
});

describe('clampSpan / dragSpan / moveSpan', () => {
  it('최소 15분, 하루(0~1439) 안으로 제한한다', () => {
    expect(clampSpan(600, 600)).toEqual({ start: 600, end: 615 });
    expect(clampSpan(-50, 30)).toEqual({ start: 0, end: 30 });
    expect(clampSpan(1400, 2000)).toEqual({ start: 1400, end: 1439 });
    expect(clampSpan(1439, 1439)).toEqual({ start: 1424, end: 1439 });
  });
  it('드래그는 위로 끌어도 순서를 바로잡고 15분 스냅한다', () => {
    expect(dragSpan(600, 700)).toEqual({ start: 600, end: 705 });
    expect(dragSpan(700, 600)).toEqual({ start: 600, end: 705 });
    expect(dragSpan(600, 603)).toEqual({ start: 600, end: 615 });
  });
  it('이동은 길이를 유지하고 하루 경계에서 멈춘다', () => {
    expect(moveSpan({ start: 600, end: 660 }, 30)).toEqual({ start: 630, end: 690 });
    expect(moveSpan({ start: 60, end: 120 }, -500)).toEqual({ start: 0, end: 60 });
    expect(moveSpan({ start: 1300, end: 1400 }, 500)).toEqual({ start: 1339, end: 1439 });
  });
});

describe('layoutDay', () => {
  it('겹치지 않으면 모두 한 열', () => {
    const r = layoutDay([ev('a', '09:00', '10:00'), ev('b', '11:00', '12:00')]);
    expect(r.map((p) => [p.event.id, p.col, p.cols])).toEqual([['a', 0, 1], ['b', 0, 1]]);
  });
  it('맞닿는 일정은 겹침이 아니다', () => {
    const r = layoutDay([ev('a', '09:00', '10:00'), ev('b', '10:00', '11:00')]);
    expect(r.every((p) => p.cols === 1)).toBe(true);
  });
  it('겹치면 나란히 배치한다', () => {
    const r = layoutDay([ev('a', '09:00', '10:00'), ev('b', '09:30', '10:30')]);
    expect(r.map((p) => [p.event.id, p.col, p.cols])).toEqual([['a', 0, 2], ['b', 1, 2]]);
  });
  it('연쇄 겹침은 한 묶음이고 빈 열을 재사용한다', () => {
    const r = layoutDay([ev('a', '09:00', '10:00'), ev('b', '09:30', '10:30'), ev('c', '10:00', '11:00')]);
    const by = Object.fromEntries(r.map((p) => [p.event.id, [p.col, p.cols]]));
    expect(by).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] });
  });
  it('입력 순서와 상관없이 같은 결과', () => {
    const r = layoutDay([ev('b', '09:30', '10:30'), ev('a', '09:00', '10:00')]);
    expect(r.find((p) => p.event.id === 'a')?.col).toBe(0);
  });
});

describe('weekDays', () => {
  it('일요일 시작 주 7일', () => {
    expect(weekDays('2026-10-05')).toEqual([
      '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10',
    ]);
  });
  it('일요일 당일은 그 날이 첫날', () => {
    expect(weekDays('2026-10-04')[0]).toBe('2026-10-04');
  });
  it('월/연 경계를 넘는다', () => {
    const w = weekDays('2026-12-31');
    expect(w[0]).toBe('2026-12-27');
    expect(w[6]).toBe('2027-01-02');
  });
  it('월요일 시작', () => {
    expect(weekDays('2026-10-04', 1)[0]).toBe('2026-09-28');
  });
});

describe('eventsByDate', () => {
  it('날짜별로 묶고 시작 시간순으로 정렬한다', () => {
    const m = eventsByDate([ev('b', '11:00', '12:00'), ev('a', '09:00', '10:00'), ev('c', '09:00', '10:00', '2026-10-06')]);
    expect(m['2026-10-05'].map((e) => e.id)).toEqual(['a', 'b']);
    expect(m['2026-10-06'].map((e) => e.id)).toEqual(['c']);
  });
});
