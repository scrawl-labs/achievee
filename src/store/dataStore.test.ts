import { describe, expect, it, vi } from 'vitest';
import { emptyData, type DataStorage } from '../storage/storage';
import type { AppData } from '../types';
import { DataStore } from './dataStore';

function memStorage(initial: AppData = emptyData()): DataStorage & { saved: AppData } {
  const s = {
    saved: initial,
    load: () => s.saved,
    save: (d: AppData) => {
      s.saved = d;
    },
  };
  return s;
}

const ev = (over: Partial<{ title: string; date: string; start: string; end: string }> = {}) => ({
  title: '회의',
  date: '2026-10-05',
  start: '10:00',
  end: '11:00',
  ...over,
});

describe('일정', () => {
  it('추가하면 id가 붙고 저장된다', () => {
    const storage = memStorage();
    const store = new DataStore(storage);
    const e = store.addEvent(ev());
    expect(e.id).toBeTruthy();
    expect(store.getSnapshot().events).toHaveLength(1);
    expect(storage.saved.events).toHaveLength(1);
  });

  it('제목은 trim되고 공백뿐이면 거부한다', () => {
    const store = new DataStore(memStorage());
    expect(store.addEvent(ev({ title: '  치과  ' })).title).toBe('치과');
    expect(() => store.addEvent(ev({ title: '   ', start: '12:00', end: '13:00' }))).toThrow('제목');
  });

  it('끝 시간이 시작보다 빠르면 거부한다', () => {
    const store = new DataStore(memStorage());
    expect(() => store.addEvent(ev({ start: '11:00', end: '10:00' }))).toThrow('늦어야');
    expect(store.getSnapshot().events).toHaveLength(0);
  });

  it('시간이 겹치는 일정도 허용한다(구글 캘린더처럼)', () => {
    const store = new DataStore(memStorage());
    store.addEvent(ev());
    expect(() => store.addEvent(ev({ start: '10:30', end: '12:00' }))).not.toThrow();
    expect(store.getSnapshot().events).toHaveLength(2);
  });

  it('수정하면 시간과 날짜가 바뀐다', () => {
    const store = new DataStore(memStorage());
    const e = store.addEvent(ev());
    expect(() => store.updateEvent(e.id, ev({ start: '10:15', end: '10:45' }))).not.toThrow();
    expect(store.getSnapshot().events[0].start).toBe('10:15');
    store.updateEvent(e.id, ev({ date: '2026-10-07' }));
    expect(store.getSnapshot().events[0].date).toBe('2026-10-07');
  });

  it('삭제', () => {
    const store = new DataStore(memStorage());
    const e = store.addEvent(ev());
    store.deleteEvent(e.id);
    expect(store.getSnapshot().events).toEqual([]);
  });
});

describe('할 일', () => {
  it('추가/토글/삭제', () => {
    const store = new DataStore(memStorage());
    const t = store.addTodo(' 빨래 ', '2026-10-05');
    expect(t.title).toBe('빨래');
    expect(t.done).toBe(false);
    store.toggleTodo(t.id);
    expect(store.getSnapshot().todos[0].done).toBe(true);
    store.toggleTodo(t.id);
    expect(store.getSnapshot().todos[0].done).toBe(false);
    store.deleteTodo(t.id);
    expect(store.getSnapshot().todos).toEqual([]);
  });

  it('공백뿐인 제목은 거부한다', () => {
    const store = new DataStore(memStorage());
    expect(() => store.addTodo('   ', '2026-10-05')).toThrow('제목');
  });
});

describe('지출', () => {
  const ex = (amount: number) => ({ amount, category: '식비', memo: '', date: '2026-10-05' });

  it('정상 금액은 저장된다', () => {
    const store = new DataStore(memStorage());
    store.addExpense(ex(4500));
    expect(store.getSnapshot().expenses[0].amount).toBe(4500);
  });

  it('0, 음수, 소수, NaN, Infinity는 거부한다', () => {
    const store = new DataStore(memStorage());
    for (const bad of [0, -100, 10.5, NaN, Infinity]) {
      expect(() => store.addExpense(ex(bad))).toThrow('금액');
    }
    expect(store.getSnapshot().expenses).toEqual([]);
  });

  it('삭제', () => {
    const store = new DataStore(memStorage());
    const x = store.addExpense(ex(1000));
    store.deleteExpense(x.id);
    expect(store.getSnapshot().expenses).toEqual([]);
  });
});

describe('구독', () => {
  it('변경 때마다 리스너를 부르고, 해제하면 부르지 않는다', () => {
    const store = new DataStore(memStorage());
    const fn = vi.fn();
    const off = store.subscribe(fn);
    store.addTodo('a', '2026-10-05');
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    store.addTodo('b', '2026-10-05');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('변경될 때마다 새 스냅샷 객체를 준다(React 갱신용)', () => {
    const store = new DataStore(memStorage());
    const before = store.getSnapshot();
    store.addTodo('a', '2026-10-05');
    expect(store.getSnapshot()).not.toBe(before);
  });
});
