import { describe, expect, it } from 'vitest';
import {
  addDays,
  hourRange,
  monthGrid,
  parseDateKey,
  timeToMinutes,
  toDateKey,
  validateEventTimes,
} from './date';

describe('toDateKey / parseDateKey', () => {
  it('로컬 날짜를 YYYY-MM-DD로 바꾸고 되돌린다', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(parseDateKey('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('addDays', () => {
  it('월/연 경계와 윤년을 넘는다', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('monthGrid', () => {
  it('윤년 2월(2024)은 목요일 시작, 5주', () => {
    const g = monthGrid(2024, 1);
    expect(g).toHaveLength(5);
    expect(g[0]).toEqual([null, null, null, null, '2024-02-01', '2024-02-02', '2024-02-03']);
    expect(g.flat().filter(Boolean).pop()).toBe('2024-02-29');
  });
  it('일요일에 시작하고 28일인 2026-02는 정확히 4주, 빈칸 없음', () => {
    const g = monthGrid(2026, 1);
    expect(g).toHaveLength(4);
    expect(g.flat().every((c) => c !== null)).toBe(true);
  });
  it('토요일에 시작하는 2026-08은 6주', () => {
    const g = monthGrid(2026, 7);
    expect(g).toHaveLength(6);
    expect(g[0][6]).toBe('2026-08-01');
  });
  it('모든 주는 7칸이다', () => {
    for (let m = 0; m < 12; m++) {
      expect(monthGrid(2026, m).every((w) => w.length === 7)).toBe(true);
    }
  });
});

describe('validateEventTimes', () => {
  it('정상 범위는 null', () => {
    expect(validateEventTimes('09:00', '10:30')).toBeNull();
  });
  it('끝이 시작과 같거나 빠르면 에러', () => {
    expect(validateEventTimes('10:00', '10:00')).toMatch(/늦어야/);
    expect(validateEventTimes('11:00', '10:00')).toMatch(/늦어야/);
  });
  it('형식이 틀리거나 비어 있으면 에러', () => {
    expect(validateEventTimes('', '10:00')).toMatch(/입력/);
    expect(validateEventTimes('9:00', '10:00')).toMatch(/입력/);
    expect(validateEventTimes('09:00', '24:00')).toMatch(/입력/);
  });
});

describe('timeToMinutes / hourRange', () => {
  it('분으로 변환한다', () => {
    expect(timeToMinutes('01:30')).toBe(90);
  });
  it('23시 칸은 23:59에서 끝난다', () => {
    expect(hourRange(9)).toEqual({ start: '09:00', end: '10:00' });
    expect(hourRange(23)).toEqual({ start: '23:00', end: '23:59' });
  });
});
