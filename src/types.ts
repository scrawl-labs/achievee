export type DateKey = string; // 'YYYY-MM-DD'

export interface CalEvent {
  id: string;
  title: string;
  date: DateKey;
  start: string; // 'HH:mm'
  end: string; // 'HH:mm'
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  date: DateKey;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  memo: string;
  date: DateKey;
}

export interface AppData {
  events: CalEvent[];
  todos: Todo[];
  expenses: Expense[];
}

export const EXPENSE_CATEGORIES = ['식비', '카페', '교통', '쇼핑', '생활', '기타'] as const;
