"use client";
import type { TaskItem } from "@/lib/types";
import { addDays } from "@/lib/dates";
import { useEvents } from "./useEvents";
import TimeGrid from "./TimeGrid";
import { useI18n } from "./I18n";

export default function DayView({ date, tasks }: { date: string; tasks: TaskItem[] }) {
  const { t } = useI18n();
  const { events, error } = useEvents(date, addDays(date, 1));
  return (
    <div className="dayview">
      <TimeGrid days={[date]} events={events} error={error} />
      <aside className="daytasks">
        <h3>{t("g.tasks")}</h3>
        {tasks.length === 0 ? <p className="muted">{t("common.none")}</p> : (
          <ul className="tasks">
            {tasks.map((tk, i) => <li key={i} className={tk.done ? "done" : ""}><span className="check" aria-hidden="true" />{tk.title || t("common.untitled")}</li>)}
          </ul>
        )}
      </aside>
    </div>
  );
}
