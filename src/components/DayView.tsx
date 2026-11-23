"use client";
import { IconButton } from "@achievee/ui";
import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, dow, mondayOf, monthStart } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import type { TaskEntry } from "@/lib/taskList";
import type { EventKind } from "@/lib/nativeEvents";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import TimeGrid from "./TimeGrid";
import { useNativeEvents } from "./useNativeEvents";
import { useI18n } from "./I18n";
import { useWide } from "./useWide";
import Icon from "./Icon";
import TaskChip, { type TaskDrag } from "./TaskChip";
import EventComposer from "./EventComposer";

const NO_TASKS: TaskEntry[] = [];

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

/** A small month for the side panel: days with events get a dot; flipping months here does not move the shown day until one is picked. */
function MiniMonth({ date, onPick }: { date: string; onPick: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const [first, setFirst] = useState(monthStart(date));
  useEffect(() => setFirst(monthStart(date)), [date]);
  const next = addMonths(first, 1);
  const { events } = useEvents(first, next);
  const busy = useMemo(() => new Set((events ?? []).map((e) => e.date)), [events]);
  const today = todayStr();
  const start = mondayOf(first);
  const weeks = Math.ceil(((dow(first) + 6) % 7 + Number(addDays(next, -1).slice(8))) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  return (
    <section className="mini">
      <div className="mini-head">
        <b>{fmt.monthYear(first.slice(0, 7))}</b>
        <span>
          <IconButton size="sm" label={t("common.prev")} icon={<Icon name="left" size={16} />} onClick={() => setFirst(addMonths(first, -1))} />
          <IconButton size="sm" label={t("common.next")} icon={<Icon name="right" size={16} />} onClick={() => setFirst(next)} />
        </span>
      </div>
      <div className="mini-grid">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => <small key={d}>{fmt.weekdayShort(d)}</small>)}
        {cells.map((d) => (
          <button key={d} type="button" aria-label={fmt.full(d)} aria-current={d === date ? "date" : undefined}
            className={`${d.slice(0, 7) !== first.slice(0, 7) ? "out" : ""}${d === date ? " on" : ""}${d === today ? " today" : ""}${busy.has(d) ? " busy" : ""}`}
            onClick={() => onPick(d)}>{Number(d.slice(8))}</button>
        ))}
      </div>
    </section>
  );
}

/** The day's to-dos as a list beside the grid; each can still be dragged onto a time slot. */
function DayTasks({ date, tasks, onToggle, onAdd, drag }: {
  date: string; tasks: TaskEntry[]; onToggle: (id: number, done: boolean) => void; onAdd: (date: string, text: string) => Promise<boolean>; drag?: TaskDrag;
}) {
  const { t, fmt } = useI18n();
  const [adding, setAdding] = useState(false);
  const done = tasks.filter((x) => x.done).length;
  return (
    <section className="daytasks">
      <div className="mini-head"><b>{t("td.ph")}</b>{tasks.length > 0 && <small>{done}/{tasks.length}</small>}</div>
      <div className="daytasks-list">
        {tasks.map((tk) => <TaskChip key={tk.key} task={tk} badge onToggle={onToggle} drag={drag} />)}
      </div>
      <div className="daytasks-add">
        <button type="button" className="tk-add wide" aria-expanded={adding} onClick={() => setAdding(!adding)}><Icon name="plus" size={14} /><span>{t("td.add")}</span></button>
        {adding && (
          <EventComposer placeholder={t("td.ph")} when={`${t("td.add")} · ${fmt.monthDay(date)}`} top="100%" align="right"
            onCancel={() => setAdding(false)}
            onSave={async (text) => { const ok = await onAdd(date, text); if (ok) setAdding(false); return ok; }} />
        )}
      </div>
    </section>
  );
}

/**
 * One day. Phones: the week strip, the date, the to-dos as one row of chips, then the grid.
 * Wide screens: the date over the grid, and a side panel with a small month and the to-do list.
 */
export default function DayView({ date, newKind, onPickDay }: { date: string; newKind?: EventKind; onPickDay?: (d: string) => void }) {
  const { fmt } = useI18n();
  const wide = useWide();
  const { events, error } = useEvents(date, addDays(date, 1));
  const { byDate, toggle, add } = useTasksRange(date, date);
  const own = useNativeEvents();
  const label = <div className="daylabel">{fmt.full(date)}</div>;
  return <TimeGrid days={[date]} events={events} error={error} tasks={byDate} onToggleTask={toggle} onAddTask={add} badge
    header={wide || !onPickDay ? label : <><WeekStrip date={date} onPick={onPickDay} />{label}</>}
    taskRow={wide ? "none" : "chips"}
    aside={wide ? (drag) => (
      <>
        {onPickDay && <MiniMonth date={date} onPick={onPickDay} />}
        <DayTasks date={date} tasks={byDate[date] ?? NO_TASKS} onToggle={toggle} onAdd={add} drag={drag} />
      </>
    ) : undefined}
    onCreate={own.create} onRename={own.rename} newKind={newKind} onRemove={own.remove}
    onMove={(id, to) => own.update({ id, ...to })} />;
}
