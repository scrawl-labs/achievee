import type { AppData } from '../types';

export interface DataStorage {
  load(): AppData;
  save(data: AppData): void;
}

export function emptyData(): AppData {
  return { events: [], todos: [], expenses: [] };
}
