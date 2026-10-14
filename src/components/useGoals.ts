"use client";
import { useCallback } from "react";
import type { GoalRow, GoalScope } from "@/lib/goals";
import { type GoalEdit, goalsUrl, removeGoal, updateGoal } from "@/lib/goalsUi";
import { type ListError, type ListSpec, useOptimisticList } from "./useOptimisticList";

export type GoalError = ListError;

/** The server answers 400 "too many goals" at GOAL_HARD_LIMIT; anything else is a generic failure. */
async function isLimit(r: Response): Promise<boolean> {
  const body: unknown = await r.json().catch(() => null);
  const msg = typeof body === "object" && body !== null && "error" in body ? (body as { error: unknown }).error : null;
  return msg === "too many goals";
}

const SPEC: ListSpec<GoalRow, GoalEdit> = { endpoint: "/api/goals", update: updateGoal, remove: removeGoal, isLimit };

/** Goals of one period; callers give the list `key={scope + periodStart}` so switching period remounts it. */
export function useGoals(scope: GoalScope, periodStart: string) {
  const { rows, error, add: addRow, patch, remove } = useOptimisticList(goalsUrl(scope, periodStart), SPEC);
  const add = useCallback((text: string) => addRow({ scope, period_start: periodStart, text }), [addRow, scope, periodStart]);
  return { rows, error, add, patch, remove };
}
