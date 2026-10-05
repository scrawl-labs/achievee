import { validateEventTimes } from '../lib/date';
import type { DataStorage } from '../storage/storage';
import type { AppData, CalEvent, DateKey, Expense, Todo } from '../types';

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

type EventInput = Omit<CalEvent, 'id'>;

export class DataStore {
  private data: AppData;
  private listeners = new Set<() => void>();

  constructor(private storage: DataStorage) {
    this.data = storage.load();
  }

  getSnapshot = (): AppData => this.data;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private commit(next: AppData) {
    this.data = next;
    this.storage.save(next);
    this.listeners.forEach((l) => l());
  }

  private checkEvent(input: EventInput): EventInput {
    const title = input.title.trim();
    if (!title) throw new Error('제목을 입력해 주세요');
    const timeError = validateEventTimes(input.start, input.end);
    if (timeError) throw new Error(timeError);
    return { ...input, title };
  }

  addEvent(input: EventInput): CalEvent {
    const event: CalEvent = { ...this.checkEvent(input), id: newId() };
    this.commit({ ...this.data, events: [...this.data.events, event] });
    return event;
  }

  updateEvent(id: string, input: EventInput): void {
    const checked = this.checkEvent(input);
    this.commit({
      ...this.data,
      events: this.data.events.map((e) => (e.id === id ? { ...checked, id } : e)),
    });
  }

  deleteEvent(id: string): void {
    this.commit({ ...this.data, events: this.data.events.filter((e) => e.id !== id) });
  }

  addTodo(title: string, date: DateKey): Todo {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('제목을 입력해 주세요');
    const todo: Todo = { id: newId(), title: trimmed, done: false, date };
    this.commit({ ...this.data, todos: [...this.data.todos, todo] });
    return todo;
  }

  toggleTodo(id: string): void {
    this.commit({
      ...this.data,
      todos: this.data.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    });
  }

  deleteTodo(id: string): void {
    this.commit({ ...this.data, todos: this.data.todos.filter((t) => t.id !== id) });
  }

  addExpense(input: Omit<Expense, 'id'>): Expense {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error('금액은 1원 이상 정수로 입력해 주세요');
    }
    const expense: Expense = { ...input, memo: input.memo.trim(), id: newId() };
    this.commit({ ...this.data, expenses: [...this.data.expenses, expense] });
    return expense;
  }

  deleteExpense(id: string): void {
    this.commit({ ...this.data, expenses: this.data.expenses.filter((x) => x.id !== id) });
  }
}
