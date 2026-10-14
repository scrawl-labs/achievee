"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTrailing } from "@/lib/trailing";
import { useApi } from "./useApi";

export type ListError = "limit" | "failed";
const NOTIFY_MS = 600; // quiet period before `onChanged`: ten quick checkbox clicks must not mean ten month refetches (each can hit Google)
const json = { "Content-Type": "application/json" };

/** What differs between lists (goals, to-dos): the endpoint, the pure optimistic edits, and how a failed add reads as "limit". Keep it module-level (stable). */
export type ListSpec<T extends { id: number }, E> = {
  endpoint: string;
  update: (rows: readonly T[], id: number, edit: E) => T[];
  remove: (rows: readonly T[], id: number) => T[];
  isLimit: (r: Response) => Promise<boolean>;
  /** Refreshes caches that derive from this list. Runs once per burst of edits (see NOTIFY_MS), never per request. */
  onChanged?: (url: string) => void; // `url`: this list's own URL, which was already reloaded when its last request settled
};

/**
 * One server-backed list. Edits show instantly (optimistic overlay); when the request settles we revalidate
 * from the server and drop the overlay, so a failed request rolls back to whatever the server really has.
 * State is per list: callers give the component a `key` so switching period remounts it
 * (fresh error, fresh in-flight counter).
 */
export function useOptimisticList<T extends { id: number }, E extends object>(url: string, spec: ListSpec<T, E>) {
  const { data, error: loadError, reload } = useApi<T[]>(url);
  const settled = data !== null || loadError; // false only while the first answer for this url is pending (callers that must not flash an empty state)
  const [local, setLocal] = useState<{ url: string; rows: T[] } | null>(null);
  const [error, setError] = useState<ListError | null>(null);
  const rows = local?.url === url ? local.rows : data ?? [];
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const inFlight = useRef(0);
  const dirty = useRef<string | null>(null); // url of a request that succeeded and whose `onChanged` has not run yet
  const alive = useRef(true);

  // Only notifies while nothing is in flight (a refetch before the last write lands would read stale data); the settle path re-arms it.
  const notify = useMemo(() => createTrailing(() => {
    const changed = dirty.current;
    if (inFlight.current > 0 || changed === null) return;
    dirty.current = null;
    spec.onChanged?.(changed);
  }, NOTIFY_MS), [spec]);
  // Leaving (another day/period remounts us): a pending notification is flushed, not dropped, because the change really happened.
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; notify.flush(); };
  }, [notify]);

  const run = useCallback(async (optimistic: T[] | null, call: () => Promise<Response>, isAdd = false): Promise<Response | null> => {
    setError(null);
    if (optimistic) setLocal({ url, rows: optimistic });
    inFlight.current += 1;
    let ok: Response | null = null;
    try {
      const r = await call();
      if (r.ok) ok = r; else setError(isAdd && (await spec.isLimit(r)) ? "limit" : "failed");
    } catch { setError("failed"); }
    inFlight.current -= 1;
    if (ok) dirty.current = url;
    if (inFlight.current === 0 && dirty.current !== null) {
      if (alive.current) notify.call();
      else { const changed = dirty.current; dirty.current = null; spec.onChanged?.(changed); } // unmounted while this was in flight: nobody will debounce, tell now
    }
    if (inFlight.current === 0) {
      await reload();
      // a newer edit may have started while reloading: its overlay must survive until it settles
      if (inFlight.current === 0) setLocal(null);
    }
    return ok;
  }, [url, reload, spec, notify]);

  const add = useCallback(async (body: object) => {
    const r = await run(null, () => fetch(spec.endpoint, { method: "POST", headers: json, body: JSON.stringify(body) }), true);
    return r !== null;
  }, [run, spec]);

  const patch = useCallback((id: number, edit: E) =>
    run(spec.update(rowsRef.current, id, edit), () => fetch(spec.endpoint, { method: "PATCH", headers: json, body: JSON.stringify({ id, ...edit }) })), [run, spec]);

  const remove = useCallback((id: number) =>
    run(spec.remove(rowsRef.current, id), () => fetch(`${spec.endpoint}?id=${id}`, { method: "DELETE" })), [run, spec]);

  return { rows, settled, error, add, patch, remove };
}
