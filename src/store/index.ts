import { useSyncExternalStore } from 'react';
import { createLocalStorage } from '../storage/localStorage';
import type { AppData } from '../types';
import { DataStore } from './dataStore';

export const store = new DataStore(createLocalStorage());

export function useAppData(): AppData {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
