"use client";
import type { MonthData, Stats } from "@/lib/types";
import { todayStr } from "@/lib/clientTime";
import { dow } from "@/lib/dates";
import Summary from "./Summary";
import Blob, { Confetti } from "./Blob";
import { levelOf as level } from "@/lib/level";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

type Props = { ym: string; month: MonthData | null; stats: Stats | null; sel: string; setSel: (d: string) => void };

export default function CalendarView({ ym, month, stats, sel, setSel }: Props) {
  const { t, fmt } = useI18n();
  const [y, m] = ym.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = todayStr();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const data = month?.ym === ym ? month : null;
  const day = data?.days[sel];

  const diary = useApi<{ date: string; body: string }[]>(`/api/diary?ym=${ym}`).data ?? [];
  const spent = useApi<{ date: string; amount: number }[]>(`/api/expenses?ym=${ym}`).data ?? [];
  const note = diary.find((d) => d.date === sel)?.body;
  const daySpent = spent.filter((s) => s.date === sel).reduce((a, s) => a + s.amount, 0);

  return (
    <>
      <Summary items={[
        [t("cal.rate"), stats ? `${Math.round(stats.rate * 100)}%` : "-"],
        [t("cal.done"), stats ? `${stats.doneTotal} / ${stats.taskTotal}` : "-"],
        [t("cal.streak"), stats ? t("cal.days", { n: stats.streak }) : "-"],
      ]} />
      <div className="workspace">
        <div className="cal">
          <div className="cal-head">{MON_FIRST.map((d, i) => <span key={d} className={i === 5 ? "sat" : i === 6 ? "sun" : ""}>{fmt.weekdayShort(d)}</span>)}</div>
          <div className="cal-grid">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="cell empty" />;
              const date = `${ym}-${String(d).padStart(2, "0")}`;
              const v = data?.days[date];
              const col = i % 7;
              return (
                <button key={i} className={`cell${date === sel ? " sel" : ""}`} onClick={() => setSel(date)}>
                  <span className={`dnum${col === 5 ? " sat" : col === 6 ? " sun" : ""}${date === today ? " today" : ""}`}>{d}</span>
                  <span className="stamp">
                    <Blob level={v ? level(v.done, v.total) : 0} label={v && v.total ? v.done : ""} />
                    {date === sel && v && level(v.done, v.total) === 4 && <Confetti key={sel} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="detail">
          <h2>{fmt.monthDay(sel)} <small>{fmt.weekdayLong(dow(sel))}</small></h2>
          <div className="big">{day ? `${day.done}` : "-"}<span> / {day ? day.total : "-"}</span></div>
          <div className="meter"><i style={{ width: day && day.total ? `${(day.done / day.total) * 100}%` : 0 }} /></div>
          {day && day.tasks.length > 0 && (
            <ul className="tasks">
              {day.tasks.map((tk, i) => (
                <li key={i} className={tk.done ? "done" : ""}><span className="check" aria-hidden="true" />{tk.title || t("common.untitled")}</li>
              ))}
            </ul>
          )}
          {day && day.eventList.length > 0 && (
            <ul className="events">
              {day.eventList.map((e, i) => <li key={i}><time>{e.time ?? t("common.allDay")}</time>{e.title || t("common.untitled")}</li>)}
            </ul>
          )}
          {daySpent > 0 && <div className="spent"><span>{t("cal.spent")}</span><b>{fmt.money(daySpent)}</b></div>}
          {note && <p className="note">{note}</p>}
        </aside>
      </div>
    </>
  );
}
