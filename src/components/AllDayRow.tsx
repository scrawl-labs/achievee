"use client";
import { useState } from "react";
import type { DayEvent } from "@/lib/types";
import type { TaskEntry } from "@/lib/taskList";
import { useI18n } from "./I18n";
import EventComposer from "./EventComposer";
import Icon from "./Icon";
import TaskChip, { type TaskDrag } from "./TaskChip";

/** Tasks shown per day before "+N more". Events are never hidden (they were never capped), so the row grows by at most this many chips per day until expanded. */
export const TASK_CAP = 3;
const NO_TASKS: TaskEntry[] = [];

/**
 * The all-day strip of the time grid: all-day events, then the day's tasks (no time of their own). One toggle expands every column.
 * With `onAdd` each day gets a "+" that opens a small box for a new own to-do; with `drag` the tasks can be dragged onto the grid.
 */
export default function AllDayRow({ days, byDay, tasks, cols, badge, onToggle, onAdd, drag, fmtDay }: {
  days: string[]; byDay: Record<string, DayEvent[]>; tasks: Record<string, TaskEntry[]>; cols: React.CSSProperties;
  badge: boolean; onToggle?: (id: number, done: boolean) => void;
  onAdd?: (date: string, text: string) => Promise<boolean>; drag?: TaskDrag; fmtDay?: (date: string) => string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const wide = days.length === 1;
  return (
    <div className="tl-allday">
      <span className="gut" />
      <div className="cols" style={cols}>
        {days.map((d, i) => {
          const ts = tasks[d] ?? NO_TASKS;
          const shown = open ? ts : ts.slice(0, TASK_CAP);
          const hidden = ts.length - shown.length;
          return (
            <div key={d} className="adcol">
              {byDay[d].filter((e) => e.allDay).map((e) => (
                <a key={e.id} className="chipday" href={e.link} target="_blank" rel="noreferrer" style={{ ["--ev" as string]: e.color }}>{e.title || t("common.untitled")}</a>
              ))}
              {shown.map((tk) => <TaskChip key={tk.key} task={tk} badge={badge} onToggle={onToggle} drag={drag} />)}
              {hidden > 0 && <button type="button" className="more tk-more" aria-expanded={false} onClick={() => setOpen(true)}>{t("g.more", { n: hidden })}</button>}
              {open && ts.length > TASK_CAP && <button type="button" className="more tk-more" aria-expanded onClick={() => setOpen(false)}>{t("task.less")}</button>}
              {onAdd && (
                <button type="button" className={`tk-add${wide ? " wide" : ""}`} aria-label={t("td.add")} aria-expanded={adding === d} onClick={() => setAdding(adding === d ? null : d)}>
                  <Icon name="plus" size={14} />{wide && <span>{t("td.add")}</span>}
                </button>
              )}
              {onAdd && adding === d && (
                <EventComposer placeholder={t("td.ph")} when={`${t("td.add")} · ${fmtDay ? fmtDay(d) : d}`} top="100%" align={days.length > 2 && i >= days.length - 2 ? "right" : "left"}
                  onCancel={() => setAdding(null)}
                  onSave={async (text) => { const ok = await onAdd(d, text); if (ok) setAdding(null); return ok; }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
