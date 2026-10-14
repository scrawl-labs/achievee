"use client";
import { useState } from "react";
import type { DayEvent } from "@/lib/types";
import type { TaskEntry } from "@/lib/taskList";
import { useI18n } from "./I18n";
import TaskChip from "./TaskChip";

/** Tasks shown per day before "+N more". Events are never hidden (they were never capped), so the row grows by at most this many chips per day until expanded. */
export const TASK_CAP = 3;
const NO_TASKS: TaskEntry[] = [];

/** The all-day strip of the time grid: all-day events, then the day's tasks (no time of their own). One toggle expands every column. */
export default function AllDayRow({ days, byDay, tasks, cols, badge, onToggle }: {
  days: string[]; byDay: Record<string, DayEvent[]>; tasks: Record<string, TaskEntry[]>; cols: React.CSSProperties;
  badge: boolean; onToggle?: (id: number, done: boolean) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="tl-allday">
      <span className="gut" />
      <div className="cols" style={cols}>
        {days.map((d) => {
          const ts = tasks[d] ?? NO_TASKS;
          const shown = open ? ts : ts.slice(0, TASK_CAP);
          const hidden = ts.length - shown.length;
          return (
            <div key={d}>
              {byDay[d].filter((e) => e.allDay).map((e) => (
                <a key={e.id} className="chipday" href={e.link} target="_blank" rel="noreferrer" style={{ ["--ev" as string]: e.color }}>{e.title || t("common.untitled")}</a>
              ))}
              {shown.map((tk) => <TaskChip key={tk.key} task={tk} badge={badge} onToggle={onToggle} />)}
              {hidden > 0 && <button type="button" className="more tk-more" aria-expanded={false} onClick={() => setOpen(true)}>{t("g.more", { n: hidden })}</button>}
              {open && ts.length > TASK_CAP && <button type="button" className="more tk-more" aria-expanded onClick={() => setOpen(false)}>{t("task.less")}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
