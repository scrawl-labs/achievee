"use client";
import { addDays, mondayOf } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import TimeGrid from "./TimeGrid";
import type { EventKind } from "@/lib/nativeEvents";
import { useNativeEvents } from "./useNativeEvents";

export default function WeekView({ date, onPickDay, newKind }: { date: string; onPickDay: (d: string) => void; newKind?: EventKind }) {
  const start = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const { events, error } = useEvents(start, addDays(start, 7));
  const { byDate, toggle, add } = useTasksRange(start, addDays(start, 6)); // may cross a month boundary: the hook loads both months
  const own = useNativeEvents();
  return <TimeGrid days={days} events={events} error={error} onPickDay={onPickDay} tasks={byDate} onToggleTask={toggle} onAddTask={add}
    onCreate={own.create} onRename={(id, title, kind) => own.update({ id, title, kind })} newKind={newKind} onRemove={own.remove}
    onMove={(id, to) => own.update({ id, ...to })} />;
}
