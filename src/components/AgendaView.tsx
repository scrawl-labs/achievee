"use client";
import type { DayEvent } from "@/lib/types";
import { addDays, addMonths, dow, monthStart } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import TaskChip from "./TaskChip";
import { hhmm } from "./TimeGrid";
import { useI18n } from "./I18n";

export default function AgendaView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const first = monthStart(date), next = addMonths(first, 1);
  const { events, error } = useEvents(first, next);
  const { byDate: tasks, toggle, ready: tasksReady } = useTasksRange(first, addDays(next, -1));
  const evBy: Record<string, DayEvent[]> = {};
  (events ?? []).forEach((e) => (evBy[e.date] ??= []).push(e));
  // days with events or tasks (the held task map may still hold the previous month while a new one loads)
  const days = [...new Set([...Object.keys(evBy), ...Object.keys(tasks)])].filter((d) => d >= first && d < next).sort();
  const event = (e: DayEvent) => (
    <li key={e.id}>
      <a href={e.link} target="_blank" rel="noreferrer">
        <i style={{ background: e.color }} />
        <time>{e.allDay ? t("common.allDay") : `${hhmm(e.startMin)} - ${hhmm(e.endMin)}`}</time>
        <b>{e.title || t("common.untitled")}</b>
        <small>{e.calendar}</small>
      </a>
    </li>
  );
  return (
    <div className="agenda">
      {error && <p className="error">{t("common.loadFail")}</p>}
      {events && tasksReady && days.length === 0 && <p className="muted">{t("common.noEvents")}</p>}
      {days.map((d) => {
        const list = evBy[d] ?? [];
        return (
          <section key={d}>
            <button className="agenda-day" onClick={() => onPickDay(d)}>
              <b>{Number(d.slice(8))}</b><span>{fmt.monthDay(d)} {fmt.weekdayLong(dow(d))}</span>
            </button>
            <ul>
              {list.filter((e) => e.allDay).map(event)}
              {(tasks[d] ?? []).map((tk) => <li key={tk.key}><TaskChip task={tk} badge onToggle={toggle} /></li>)}
              {list.filter((e) => !e.allDay).map(event)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
