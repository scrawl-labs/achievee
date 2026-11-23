"use client";
import { addDays, dow, mondayOf } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import TimeGrid from "./TimeGrid";
import type { EventKind } from "@/lib/nativeEvents";
import { useNativeEvents } from "./useNativeEvents";
import { useI18n } from "./I18n";

/** The week around the shown day, one tap to jump (like a phone calendar's week strip). Today is the accent circle, the shown day the dark one. */
function WeekStrip({ date, onPick }: { date: string; onPick: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const today = todayStr();
  const week = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(date), i));
  return (
    <div className="daystrip" role="group" aria-label={t("g.week")}>
      {week.map((d) => (
        <button key={d} type="button" className={`${d === date ? "on" : ""}${d === today ? " today" : ""}`} aria-pressed={d === date} aria-label={fmt.full(d)} onClick={() => onPick(d)}>
          <small className={dow(d) === 6 ? "sat" : dow(d) === 0 ? "sun" : ""}>{fmt.weekdayShort(dow(d))}</small>
          <b>{Number(d.slice(8))}</b>
        </button>
      ))}
    </div>
  );
}

/** One wide column: tasks sit in the all-day strip with their "Google" pill (they used to be a separate side list). */
export default function DayView({ date, newKind, onPickDay }: { date: string; newKind?: EventKind; onPickDay?: (d: string) => void }) {
  const { events, error } = useEvents(date, addDays(date, 1));
  const { byDate, toggle, add } = useTasksRange(date, date);
  const own = useNativeEvents();
  return <TimeGrid days={[date]} events={events} error={error} tasks={byDate} onToggleTask={toggle} onAddTask={add} badge
    header={onPickDay && <WeekStrip date={date} onPick={onPickDay} />}
    onCreate={own.create} onRename={own.rename} newKind={newKind} onRemove={own.remove}
    onMove={(id, to) => own.update({ id, ...to })} />;
}
