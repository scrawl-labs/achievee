"use client";
import { addDays } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import TimeGrid from "./TimeGrid";
import { useNativeEvents } from "./useNativeEvents";

/** One wide column: tasks sit in the all-day strip with their "Google" pill (they used to be a separate side list). */
export default function DayView({ date }: { date: string }) {
  const { events, error } = useEvents(date, addDays(date, 1));
  const { byDate, toggle } = useTasksRange(date, date);
  const own = useNativeEvents();
  return <TimeGrid days={[date]} events={events} error={error} tasks={byDate} onToggleTask={toggle} badge
    onCreate={own.create} onRename={(id, title) => own.update({ id, title })} onRemove={own.remove} />;
}
