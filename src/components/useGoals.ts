"use client";
import { useCallback, useRef, useState } from "react";
import type { GoalRow, GoalScope } from "@/lib/goals";
import { type GoalEdit, goalsUrl, removeGoal, updateGoal } from "@/lib/goalsUi";
import { useApi } from "./useApi";

export type GoalError = "limit" | "failed";
const json = { "Content-Type": "application/json" };

/** The server answers 400 "too many goals" at GOAL_HARD_LIMIT; anything else is a generic failure. */
async function errorOf(r: Response): Promise<GoalError> {
  const body: unknown = await r.json().catch(() => null);
  const msg = typeof body === "object" && body !== null && "error" in body ? (body as { error: unknown }).error : null;
  return msg === "too many goals" ? "limit" : "failed";
}

/**
 * Goals of one period. Edits show instantly (optimistic overlay); when the request settles we revalidate
 * from the server and drop the overlay, so a failed request rolls back to whatever the server really has.
 * State is per period: callers give the list `key={scope + periodStart}` so switching period remounts it
 * (fresh error, fresh in-flight counter).
 */
export function useGoals(scope: GoalScope, periodStart: string) {
  const url = goalsUrl(scope, periodStart);
  const { data, reload } = useApi<GoalRow[]>(url);
  const [local, setLocal] = useState<{ url: string; rows: GoalRow[] } | null>(null);
  const [error, setError] = useState<GoalError | null>(null);
  const rows = local?.url === url ? local.rows : data ?? [];
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const inFlight = useRef(0);

  const run = useCallback(async (optimistic: GoalRow[] | null, call: () => Promise<Response>): Promise<Response | null> => {
    setError(null);
    if (optimistic) setLocal({ url, rows: optimistic });
    inFlight.current += 1;
    let ok: Response | null = null;
    try {
      const r = await call();
      if (r.ok) ok = r; else setError(await errorOf(r));
    } catch { setError("failed"); }
    inFlight.current -= 1;
    if (inFlight.current === 0) {
      await reload();
      // a newer edit may have started while reloading: its overlay must survive until it settles
      if (inFlight.current === 0) setLocal(null);
    }
    return ok;
  }, [url, reload]);

  const add = useCallback(async (text: string) => {
    const r = await run(null, () => fetch("/api/goals", { method: "POST", headers: json, body: JSON.stringify({ scope, period_start: periodStart, text }) }));
    return r !== null;
  }, [run, scope, periodStart]);

  const patch = useCallback((id: number, edit: GoalEdit) =>
    run(updateGoal(rowsRef.current, id, edit), () => fetch("/api/goals", { method: "PATCH", headers: json, body: JSON.stringify({ id, ...edit }) })), [run]);

  const remove = useCallback((id: number) =>
    run(removeGoal(rowsRef.current, id), () => fetch(`/api/goals?id=${id}`, { method: "DELETE" })), [run]);

  return { rows, error, add, patch, remove };
}
