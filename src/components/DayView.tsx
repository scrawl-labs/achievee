"use client";
import { addDays } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import TimeGrid from "./TimeGrid";
import type { EventKind } from "@/lib/nativeEvents";
import { useNativeEvents } from "./useNativeEvents";

/** One wide column: tasks sit in the all-day strip with their "Google" pill (they used to be a separate side list). */
export default function DayView({ date, newKind }: { date: string; newKind?: EventKind }) {
  const { events, error } = useEvents(date, addDays(date, 1));
  const { byDate, toggle, add } = useTasksRange(date, date);
  const own = useNativeEvents();
  return <TimeGrid days={[date]} events={events} error={error} tasks={byDate} onToggleTask={toggle} onAddTask={add} badge
    onCreate={own.create} onRename={(id, title, kind) => own.update({ id, title, kind })} newKind={newKind} onRemove={own.remove}
    onMove={(id, to) => own.update({ id, ...to })} />;
}
