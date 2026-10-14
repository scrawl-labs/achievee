"use client";
import type { DayEvent } from "@/lib/types";
import { mergeEvents } from "@/lib/calendarSources";
import { browserTz } from "@/lib/clientTime";
import { useMemo } from "react";
import { useApi } from "./useApi";

/** Events in [from, to). `events` is null while loading. */
export function useEvents(from: string, to: string) {
  const { data, error } = useApi<DayEvent[]>(`/api/events?from=${from}&to=${to}&tz=${encodeURIComponent(browserTz())}`);
  // Every source goes through mergeEvents; today only Google feeds it.
  const events = useMemo(() => (data ? mergeEvents(data) : null), [data]);
  return { events, error };
}
