"use client";
import { useEffect, useState } from "react";
import type { DayEvent } from "@/lib/types";

/** Events in [from, to). `events` is null while loading. */
export function useEvents(from: string, to: string) {
  const [state, setState] = useState<{ key: string; events: DayEvent[] | null; error: string }>({ key: "", events: null, error: "" });
  const key = `${from}/${to}`;
  useEffect(() => {
    let live = true;
    fetch(`/api/events?from=${from}&to=${to}`).then(async (r) => {
      const j = await r.json();
      if (live) setState({ key, events: r.ok ? j : null, error: r.ok ? "" : j.error ?? "불러오기 실패" });
    });
    return () => { live = false; };
  }, [from, to, key]);
  return { events: state.key === key ? state.events : null, error: state.key === key ? state.error : "" };
}
