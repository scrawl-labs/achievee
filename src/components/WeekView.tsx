"use client";
import { addDays, mondayOf } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import TimeGrid from "./TimeGrid";
import { useNativeEvents } from "./useNativeEvents";

export default function WeekView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const start = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const { events, error } = useEvents(start, addDays(start, 7));
  const { byDate, toggle } = useTasksRange(start, addDays(start, 6)); // may cross a month boundary: the hook loads both months
  const own = useNativeEvents();
  return <TimeGrid days={days} events={events} error={error} onPickDay={onPickDay} tasks={byDate} onToggleTask={toggle}
    onCreate={own.create} onRename={(id, title) => own.update({ id, title })} onRemove={own.remove}
    onMove={(id, to) => own.update({ id, ...to })} />;
}
