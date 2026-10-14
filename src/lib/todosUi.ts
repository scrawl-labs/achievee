import { GOAL_TEXT_MAX } from "./goals";

/** Pure helpers behind the day panel's own to-dos (the server owns the real rules; this mirrors the contract). */

export type TodoRow = { id: number; date: string; text: string; done: boolean; position: number };
export type TodoEdit = Partial<Pick<TodoRow, "text" | "done">>;

/** Same cap as goals (the server reuses it); anything longer is rejected with 400. */
export const TODO_TEXT_MAX = GOAL_TEXT_MAX;

/** One day, inclusive on both ends (the API's `to` is inclusive). */
export const todosUrl = (date: string) => `/api/todos?from=${date}&to=${date}`;

/** Trimmed text, or null when it would be rejected (empty / over the limit). */
export function normalizeTodoText(raw: string): string | null {
  const t = raw.trim();
  return t.length >= 1 && t.length <= TODO_TEXT_MAX ? t : null;
}

/** The server answers 400 "too many todos" at its hard limit; any other failure is generic (same approach as goals). */
export function isTodoLimit(body: unknown): boolean {
  return typeof body === "object" && body !== null && "error" in body && (body as { error: unknown }).error === "too many todos";
}

export const updateTodo = (rows: readonly TodoRow[], id: number, edit: TodoEdit): TodoRow[] =>
  rows.map((r) => (r.id === id ? { ...r, ...edit } : r));
export const removeTodo = (rows: readonly TodoRow[], id: number): TodoRow[] => rows.filter((r) => r.id !== id);
