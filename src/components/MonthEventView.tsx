"use client";
import type { DayEvent } from "@/lib/types";
import { WD_KO, addDays, addMonths, dow, monthStart } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { hhmm } from "./TimeGrid";
import { todayStr } from "./App";

const MAX = 3;
const order = (a: DayEvent, b: DayEvent) => Number(b.allDay) - Number(a.allDay) || a.startMin - b.startMin;

export default function MonthEventView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const first = monthStart(date), next = addMonths(first, 1);
  const { events, error } = useEvents(first, next);
  const today = todayStr();
  const lead = (dow(first) + 6) % 7;
  const count = Number(addDays(next, -1).slice(8));
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(first, i))] as (string | null)[];
  const by: Record<string, DayEvent[]> = {};
  (events ?? []).forEach((e) => (by[e.date] ??= []).push(e));

  return (
    <div className="mgrid">
      {error && <p className="error" style={{ padding: 16 }}>{error}</p>}
      <div className="cal-head">{[1, 2, 3, 4, 5, 6, 0].map((d) => <span key={d} className={d === 6 ? "sat" : d === 0 ? "sun" : ""}>{WD_KO[d]}</span>)}</div>
      <div className="mcells">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="mcell empty" />;
          const list = (by[d] ?? []).sort(order);
          return (
            <button key={d} className={`mcell${d === date ? " sel" : ""}`} onClick={() => onPickDay(d)}>
              <span className={`dnum${dow(d) === 6 ? " sat" : dow(d) === 0 ? " sun" : ""}${d === today ? " today" : ""}`}>{Number(d.slice(8))}</span>
              {list.slice(0, MAX).map((e) => (
                <span key={e.id} className={`mev${e.allDay ? " all" : ""}`} style={{ ["--ev" as string]: e.color }}>
                  {!e.allDay && <time>{hhmm(e.startMin)}</time>}{e.title}
                </span>
              ))}
              {list.length > MAX && <span className="more">+{list.length - MAX}개</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
