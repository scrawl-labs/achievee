"use client";
import type { DayEvent } from "@/lib/types";
import { addDays, addMonths, dow, monthStart } from "@/lib/dates";
import { allocateMonthItems } from "@/lib/monthSlots";
import { useEvents } from "./useEvents";
import { useTasksRange } from "./useTasksRange";
import { hhmm } from "./TimeGrid";
import { todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";

const MAX = 3;
const order = (a: DayEvent, b: DayEvent) => Number(b.allDay) - Number(a.allDay) || a.startMin - b.startMin;

export default function MonthEventView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const first = monthStart(date), next = addMonths(first, 1);
  const { events, error } = useEvents(first, next);
  const { byDate: tasks } = useTasksRange(first, addDays(next, -1));
  const today = todayStr();
  const lead = (dow(first) + 6) % 7;
  const count = Number(addDays(next, -1).slice(8));
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(first, i))] as (string | null)[];
  const by: Record<string, DayEvent[]> = {};
  (events ?? []).forEach((e) => (by[e.date] ??= []).push(e));

  return (
    <div className="mgrid">
      {error && <p className="error" style={{ padding: 16 }}>{t("common.loadFail")}</p>}
      <div className="cal-head">{[1, 2, 3, 4, 5, 6, 0].map((d) => <span key={d} className={d === 6 ? "sat" : d === 0 ? "sun" : ""}>{fmt.weekdayShort(d)}</span>)}</div>
      <div className="mcells">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="mcell empty" />;
          const list = (by[d] ?? []).sort(order);
          // events take the chip slots first, tasks fill what is left (the cell is a button, so task chips only display: toggle in day/week/agenda)
          const { items, hidden } = allocateMonthItems(list, tasks[d] ?? [], MAX);
          return (
            <button key={d} className={`mcell${d === date ? " sel" : ""}`} onClick={() => onPickDay(d)}>
              <span className={`dnum${dow(d) === 6 ? " sat" : dow(d) === 0 ? " sun" : ""}${d === today ? " today" : ""}`}>{Number(d.slice(8))}</span>
              {items.map((it) => it.k === "t" ? (
                <span key={it.tk.key} className={`mev tk${it.tk.done ? " done" : ""}`}>
                  <span className="check" aria-hidden="true" /><span className="tk-title">{it.tk.text || t("common.untitled")}</span>
                  {it.tk.source === "google" && <span className="sr-only">{t("task.google")}</span>}
                  {it.tk.done && <span className="sr-only">{t("task.doneSr")}</span>}
                </span>
              ) : (
                <span key={it.e.id} className={`mev${it.e.allDay ? " all" : ""}`} style={{ ["--ev" as string]: it.e.color }}>
                  {!it.e.allDay && <time>{hhmm(it.e.startMin)}</time>}{it.e.title || t("common.untitled")}
                </span>
              ))}
              {hidden > 0 && <span className="more">{t("g.more", { n: hidden })}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
