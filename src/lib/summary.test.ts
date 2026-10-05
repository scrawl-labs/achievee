import { describe, expect, it } from 'vitest';
import { emptyData } from '../storage/storage';
import { summarizeByDate } from './summary';

describe('summarizeByDate', () => {
  it('빈 데이터는 빈 객체', () => {
    expect(summarizeByDate(emptyData())).toEqual({});
  });

  it('날짜별 일정 수와 지출 합계를 센다', () => {
    const data = {
      events: [
        { id: '1', title: 'a', date: '2026-10-05', start: '09:00', end: '10:00' },
        { id: '2', title: 'b', date: '2026-10-05', start: '11:00', end: '12:00' },
        { id: '3', title: 'c', date: '2026-10-06', start: '09:00', end: '10:00' },
      ],
      todos: [],
      expenses: [
        { id: 'x', amount: 1000, category: '식비', memo: '', date: '2026-10-05' },
        { id: 'y', amount: 2500, category: '카페', memo: '', date: '2026-10-05' },
        { id: 'z', amount: 700, category: '교통', memo: '', date: '2026-10-07' },
      ],
    };
    expect(summarizeByDate(data)).toEqual({
      '2026-10-05': { events: 2, spent: 3500 },
      '2026-10-06': { events: 1, spent: 0 },
      '2026-10-07': { events: 0, spent: 700 },
    });
  });
});
