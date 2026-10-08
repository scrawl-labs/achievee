"use client";
import type { TaskItem } from "@/lib/types";
import { addDays } from "@/lib/dates";
import { useEvents } from "./useEvents";
import TimeGrid from "./TimeGrid";

export default function DayView({ date, tasks }: { date: string; tasks: TaskItem[] }) {
  const { events, error } = useEvents(date, addDays(date, 1));
  return (
    <div className="dayview">
      <TimeGrid days={[date]} events={events} error={error} />
      <aside className="daytasks">
        <h3>할 일</h3>
        {tasks.length === 0 ? <p className="muted">없음</p> : (
          <ul className="tasks">
            {tasks.map((t, i) => <li key={i} className={t.done ? "done" : ""}><span className="check" aria-hidden="true" />{t.title}</li>)}
          </ul>
        )}
      </aside>
    </div>
  );
}
