"use client";
import type { DayEvent } from "@/lib/types";
import { browserTz } from "@/lib/clientTime";
import { useApi } from "./useApi";

/** Events in [from, to). `events` is null while loading. */
export function useEvents(from: string, to: string) {
  const { data, error } = useApi<DayEvent[]>(`/api/events?from=${from}&to=${to}&tz=${encodeURIComponent(browserTz())}`);
  return { events: data, error };
}
