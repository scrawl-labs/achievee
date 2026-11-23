"use client";
import { useMemo } from "react";
import type { EventKind, NativeEventCreate, NativeEventPatch } from "@/lib/nativeEvents";
import { invalidate } from "./useApi";

const json = { "Content-Type": "application/json" };

/**
 * Writes for own calendar events. They come back through /api/events (merged with Google) and /api/month (day counts),
 * so a change only has to refresh those caches. Each call resolves true when the server accepted it.
 */
export function useNativeEvents() {
  return useMemo(() => {
    const send = async (method: string, url: string, body?: unknown): Promise<boolean> => {
      try {
        const r = await fetch(url, { method, headers: json, body: body === undefined ? undefined : JSON.stringify(body) });
        if (r.ok) { invalidate("/api/events"); invalidate("/api/month"); }
        return r.ok;
      } catch { return false; }
    };
    return {
      create: (e: NativeEventCreate) => send("POST", "/api/native-events", e),
      update: (p: NativeEventPatch) => send("PATCH", "/api/native-events", p),
      remove: (id: number) => send("DELETE", `/api/native-events?id=${id}`),
      /** Every own event with this exact title gets this kind (the plan / appointment split, for events made before it). */
      setKindByTitle: (title: string, kind: EventKind) => send("PUT", "/api/native-events", { title, kind }),
      /** Rename / re-kind one event, and with `sameTitle` every event with its (new) title too. */
      rename: async (id: number, title: string, kind?: EventKind, sameTitle?: boolean) => {
        if (!(await send("PATCH", "/api/native-events", { id, title, kind }))) return false;
        return sameTitle && kind ? send("PUT", "/api/native-events", { title, kind }) : true;
      },
    };
  }, []);
}
