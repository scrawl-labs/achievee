"use client";
import { useState } from "react";
import type { MonthData, Stats } from "@/lib/types";
import { todayStr } from "@/lib/clientTime";
import { dow } from "@/lib/dates";
import Summary from "./Summary";
import Blob, { Confetti } from "./Blob";
import { levelOf as level } from "@/lib/level";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import WorkList from "./WorkList";
import { addDays } from "@/lib/dates";
import { browserTz } from "@/lib/clientTime";
import type { WorkItem } from "@/lib/integrations/types";
import { emoLang, wordText } from "@/lib/emotions";
import { addMonths } from "@/lib/dates";
import type { WorkoutRow } from "@/lib/workout";
import { type IntakeRow, dayTotal, liters } from "@/lib/intake";
import type { Key } from "@/lib/i18n";

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

type Props = { ym: string; month: MonthData | null; stats: Stats | null; sel: string; setSel: (d: string) => void; onDiary: () => void };

export default function CalendarView({ ym, month, stats, sel, setSel, onDiary }: Props) {
  const { t, fmt, locale } = useI18n();
  const [y, m] = ym.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = todayStr();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const data = month?.ym === ym ? month : null;
  const day = data?.days[sel];

  const diary = useApi<{ date: string; body: string; emotions?: string[] }[]>(`/api/diary?ym=${ym}`).data ?? [];
  const spent = useApi<{ date: string; amount: number }[]>(`/api/expenses?ym=${ym}`).data ?? [];
  const work = useApi<{ items: WorkItem[]; errors: string[]; connected: string[] }>(`/api/work?from=${sel}&to=${addDays(sel, 1)}&tz=${encodeURIComponent(browserTz())}`).data;
  const wos = useApi<WorkoutRow[]>(`/api/workouts?from=${ym}-01&to=${addMonths(`${ym}-01`, 1)}`).data ?? [];
  const dayWos = wos.filter((w) => w.date === sel);
  const intakes = useApi<IntakeRow[]>(`/api/intake?from=${sel}&to=${addDays(sel, 1)}`).data ?? [];
  const dayWater = dayTotal(intakes, sel, "water"), dayProtein = dayTotal(intakes, sel, "protein");
  const entry = diary.find((d) => d.date === sel);
  const note = entry?.body;
  const diaryDays = new Set(diary.map((d) => d.date));
  const [openNote, setOpenNote] = useState<string | null>(null); // the day whose diary is shown in full
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
                <button key={i} className={`cell${date === sel ? " sel" : ""}${diaryDays.has(date) ? " has-diary" : ""}`} onClick={() => setSel(date)}>
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
          {work && work.items.length > 0 && (
            <section className="workday">
              <h4>{t("int.workTitle")}</h4>
              <WorkList items={work.items} />
            </section>
          )}
          {dayWos.length > 0 && (
            <section className="workday">
              <h4>{t("nav.workout")}</h4>
              <ul>{dayWos.map((w) => <li key={w.id}><span className="kind k-edited">{t(`wo.k.${w.kind}` as Key)}</span><span>{t("foc.min", { m: w.minutes })}{w.memo && ` · ${w.memo}`}</span></li>)}</ul>
            </section>
          )}
          {(dayWater > 0 || dayProtein > 0) && <div className="spent"><span>{t("in.title")}</span><b>{t("in.dayLine", { water: liters(dayWater), protein: `${dayProtein}g` })}</b></div>}
          {daySpent > 0 && <div className="spent"><span>{t("cal.spent")}</span><b>{fmt.money(daySpent)}</b></div>}
          <section className="dayDiary">
            <div className="row between">
              <h4>{t("nav.diary")}</h4>
              <button type="button" className="btn" onClick={onDiary}>{note || entry?.emotions?.length ? t("common.edit") : t("cal.writeDiary")}</button>
            </div>
            {entry?.emotions && entry.emotions.length > 0 && <span className="emo-tags">{entry.emotions.map((id) => <i key={id}>{wordText(id, emoLang(locale))}</i>)}</span>}
            {note && <button type="button" className={`note${openNote === sel ? " open" : ""}`} aria-expanded={openNote === sel} onClick={() => setOpenNote(openNote === sel ? null : sel)}>{note}</button>}
          </section>
        </aside>
      </div>
    </>
  );
}
