"use client";
import { addDays, mondayOf } from "@/lib/dates";
import { useEvents } from "./useEvents";
import TimeGrid from "./TimeGrid";

export default function WeekView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const start = mondayOf(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const { events, error } = useEvents(start, addDays(start, 7));
  return <TimeGrid days={days} events={events} error={error} onPickDay={onPickDay} />;
}
