"use client";
import type { TaskEntry } from "@/lib/taskList";
import { useI18n } from "./I18n";

/** Lets the grid turn a task into an event by dragging it onto a time slot. `suppressClick` tells a click that ends a drag from a real toggle. */
export type TaskDrag = { onPointerDown: (ev: React.PointerEvent, task: TaskEntry) => void; suppressClick: () => boolean };

/**
 * A task in the schedule views (all-day row, agenda): a check circle + title, struck through and dimmed when done.
 * An own to-do toggles when `onToggle` is given (edit/delete stay in the day panel); a Google task is read-only.
 * With `drag`, either kind can be dragged out of the row (the grid creates an event from its title).
 * `badge` shows the small "Google" pill; without it (narrow columns) screen readers still get the text.
 */
export default function TaskChip({ task, badge = false, onToggle, drag }: { task: TaskEntry; badge?: boolean; onToggle?: (id: number, done: boolean) => void; drag?: TaskDrag }) {
  const { t } = useI18n();
  const cls = `tkc${task.done ? " done" : ""}${drag ? " draggable" : ""}`;
  const grab = drag ? { onPointerDown: (ev: React.PointerEvent) => drag.onPointerDown(ev, task) } : {};
  const body = (
    <>
      <span className="check" aria-hidden="true" />
      <span className="tk-title">{task.text || t("common.untitled")}</span>
      {task.source === "google" && <>{badge && <span className="tk-src" aria-hidden="true">Google</span>}<span className="sr-only">{t("task.google")}</span></>}
    </>
  );
  if (task.source === "own" && onToggle) {
    return (
      <button type="button" role="checkbox" aria-checked={task.done} className={cls} {...grab}
        onClick={(ev) => { if (drag?.suppressClick()) { ev.preventDefault(); return; } onToggle(task.id, !task.done); }}>{body}</button>
    );
  }
  return <span role="checkbox" aria-checked={task.done} aria-readonly="true" className={cls} {...grab}>{body}</span>;
}
