import type { AppData, CalEvent, Expense, Todo } from '../types';
import { emptyData, type DataStorage } from './storage';

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'daily-garden:v1';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isStr = (v: unknown): v is string => typeof v === 'string';

const isEvent = (v: unknown): v is CalEvent =>
  isObj(v) && isStr(v.id) && isStr(v.title) && isStr(v.date) && isStr(v.start) && isStr(v.end);
const isTodo = (v: unknown): v is Todo =>
  isObj(v) && isStr(v.id) && isStr(v.title) && typeof v.done === 'boolean' && isStr(v.date);
const isExpense = (v: unknown): v is Expense =>
  isObj(v) &&
  isStr(v.id) &&
  typeof v.amount === 'number' &&
  Number.isFinite(v.amount) &&
  isStr(v.category) &&
  isStr(v.memo) &&
  isStr(v.date);

function list<T>(v: unknown, guard: (x: unknown) => x is T): T[] {
  return Array.isArray(v) ? v.filter(guard) : [];
}

function sanitize(raw: unknown): AppData {
  if (!isObj(raw)) return emptyData();
  return {
    events: list(raw.events, isEvent),
    todos: list(raw.todos, isTodo),
    expenses: list(raw.expenses, isExpense),
  };
}

export function createLocalStorage(getBackend: () => StorageBackend = () => window.localStorage): DataStorage {
  return {
    load() {
      try {
        const raw = getBackend().getItem(KEY);
        return raw ? sanitize(JSON.parse(raw)) : emptyData();
      } catch {
        return emptyData();
      }
    },
    save(data) {
      try {
        getBackend().setItem(KEY, JSON.stringify(data));
      } catch {
        // 저장소를 못 쓰는 환경: 이번 세션 메모리에서만 동작한다.
      }
    },
  };
}
