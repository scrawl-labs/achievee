"use client";
import type { MonthData, Stats } from "@/lib/types";
import { todayStr } from "@/lib/clientTime";
import { dow } from "@/lib/dates";
import Summary from "./Summary";
import Blob, { Confetti } from "./Blob";
import { levelOf as level } from "@/lib/level";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import WorkList from "./WorkList";
import GoalList from "./GoalList";
import TodoList from "./TodoList";
import { periodStartOf } from "@/lib/goalsUi";
import { addDays } from "@/lib/dates";
import { browserTz } from "@/lib/clientTime";
import type { WorkItem } from "@/lib/integrations/types";
import { emoLang, wordText } from "@/lib/emotions";
import { addMonths } from "@/lib/dates";
import type { WorkoutRow } from "@/lib/workout";
import { type IntakeRow, dayTotal, liters } from "@/lib/intake";
import type { Key } from "@/lib/i18n";
import Upcoming from "./Upcoming";
import type { GMode } from "./ScheduleView";

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

type Props = {
  ym: string; month: MonthData | null; stats: Stats | null; sel: string; setSel: (d: string) => void; onDiary: () => void;
  onSchedule: (date: string, mode: GMode, kind?: "appointment") => void; // opens the Schedule tab on that day
  onOpen: (tab: "workout" | "expense") => void;     // a summary tile opens its tab
};

export default function CalendarView({ ym, month, stats, sel, setSel, onDiary, onSchedule, onOpen }: Props) {
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
  const emotions = entry?.emotions ?? [];
  const diaryDays = new Set(diary.map((d) => d.date));
  const woMin = dayWos.reduce((a, w) => a + w.minutes, 0);
  const daySpent = spent.filter((s) => s.date === sel).reduce((a, s) => a + s.amount, 0);

  return (
    <>
      <Summary items={[
        [t("cal.rate"), stats ? `${Math.round(stats.rate * 100)}%` : "-"],
        [t("cal.done"), stats ? `${stats.doneTotal} / ${stats.taskTotal}` : "-"],
        [t("cal.streak"), stats ? t("cal.days", { n: stats.streak }) : "-"],
      ]} />
      <div className="workspace">
        <Upcoming onOpen={onSchedule} />
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
          <TodoList key={`todo${sel}`} date={sel} google={day?.tasks ?? []} label={sel === today ? t("todo.today") : t("todo.dayOf")} />
          <GoalList key={`week${periodStartOf("week", sel)}`} scope="week" periodStart={periodStartOf("week", sel)} label={t("goal.week")} />
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
          {/* the rest of the day at a glance; each tile opens where it is logged */}
          <div className="dp-tiles">
            <button type="button" onClick={() => onOpen("workout")}>
              <small>{t("nav.workout")}</small>
              <b>{dayWos.length ? `${dayWos.length > 1 ? t("wo.times", { n: dayWos.length }) : t(`wo.k.${dayWos[0].kind}` as Key)} ${t("foc.min", { m: woMin })}` : "–"}</b>
            </button>
            <button type="button" onClick={() => onOpen("expense")}><small>{t("cal.spent")}</small><b>{daySpent > 0 ? fmt.money(daySpent) : "–"}</b></button>
            <button type="button" onClick={() => onOpen("workout")}><small>{t("in.water")}</small><b>{dayWater > 0 ? liters(dayWater) : "–"}</b></button>
            <button type="button" onClick={() => onOpen("workout")}><small>{t("in.protein")}</small><b>{dayProtein > 0 ? `${dayProtein}g` : "–"}</b></button>
          </div>
          <button type="button" className="dp-diary" onClick={onDiary}>
            <span className="dp-h"><h4>{t("nav.diary")}</h4><small>{note || emotions.length ? t("common.edit") : t("cal.writeDiary")} ›</small></span>
            {emotions.length > 0 && <span className="emo-tags">{emotions.map((id) => <i key={id}>{wordText(id, emoLang(locale))}</i>)}</span>}
            {note && <span className="dp-note">{note}</span>}
          </button>
        </aside>
      </div>
    </>
  );
}
