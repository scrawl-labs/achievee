import { describe, expect, it } from 'vitest';
import { createLocalStorage, type StorageBackend } from './localStorage';
import { emptyData } from './storage';

function fakeBackend(initial: Record<string, string> = {}): StorageBackend & { map: Record<string, string> } {
  const map = { ...initial };
  return {
    map,
    getItem: (k) => (k in map ? map[k] : null),
    setItem: (k, v) => {
      map[k] = v;
    },
  };
}

const KEY = 'daily-garden:v1';

describe('createLocalStorage', () => {
  it('저장한 데이터를 그대로 불러온다', () => {
    const backend = fakeBackend();
    const s = createLocalStorage(() => backend);
    const data = {
      events: [{ id: 'e1', title: '치과', date: '2026-10-05', start: '10:00', end: '11:00' }],
      todos: [{ id: 't1', title: '빨래', done: true, date: '2026-10-05' }],
      expenses: [{ id: 'x1', amount: 4500, category: '카페', memo: '라떼', date: '2026-10-05' }],
    };
    s.save(data);
    expect(s.load()).toEqual(data);
  });

  it('아무것도 없으면 빈 데이터', () => {
    expect(createLocalStorage(() => fakeBackend()).load()).toEqual(emptyData());
  });

  it('JSON이 아닌 값이면 빈 데이터', () => {
    const s = createLocalStorage(() => fakeBackend({ [KEY]: '{깨짐' }));
    expect(s.load()).toEqual(emptyData());
  });

  it('최상위가 객체가 아니거나 배열 필드가 아니면 빈 목록', () => {
    expect(createLocalStorage(() => fakeBackend({ [KEY]: '42' })).load()).toEqual(emptyData());
    expect(createLocalStorage(() => fakeBackend({ [KEY]: 'null' })).load()).toEqual(emptyData());
    expect(
      createLocalStorage(() => fakeBackend({ [KEY]: JSON.stringify({ events: 'x', todos: {}, expenses: 1 }) })).load(),
    ).toEqual(emptyData());
  });

  it('필드가 빠진 항목은 버리고 유효한 항목만 남긴다', () => {
    const raw = JSON.stringify({
      events: [{ id: 'e1', title: '정상', date: '2026-10-05', start: '10:00', end: '11:00' }, { id: 'e2' }],
      todos: [{ id: 't1', title: '할 일', done: 'yes', date: '2026-10-05' }],
      expenses: [{ id: 'x1', amount: 'abc', category: '식비', memo: '', date: '2026-10-05' }],
    });
    const data = createLocalStorage(() => fakeBackend({ [KEY]: raw })).load();
    expect(data.events.map((e) => e.id)).toEqual(['e1']);
    expect(data.todos).toEqual([]);
    expect(data.expenses).toEqual([]);
  });

  it('저장소 접근이 예외를 던져도 load/save가 죽지 않는다', () => {
    const throwing = () => {
      throw new Error('blocked');
    };
    const s = createLocalStorage(throwing);
    expect(s.load()).toEqual(emptyData());
    expect(() => s.save(emptyData())).not.toThrow();
  });

  it('setItem이 용량 초과로 던져도 save가 죽지 않는다', () => {
    const backend: StorageBackend = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(() => createLocalStorage(() => backend).save(emptyData())).not.toThrow();
  });
});
