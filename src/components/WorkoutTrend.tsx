"use client";
import { addDays } from "@/lib/dates";
import type { Key } from "@/lib/i18n";
import type { WorkoutRow } from "@/lib/workout";
import { weeksBack, workoutTrend } from "@/lib/workoutTrend";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

const WEEKS = 8;
const BAR_PX = 96;

/** The last eight weeks of exercise against the weekly goal: sessions per week, how many weeks hit the goal, the usual kind and length. */
export default function WorkoutTrend({ sel, goal }: { sel: string; goal: number }) {
  const { t, fmt } = useI18n();
  const first = weeksBack(sel, WEEKS)[0];
  const { data } = useApi<WorkoutRow[]>(`/api/workouts?from=${first}&to=${addDays(first, WEEKS * 7)}`);
  if (!data) return null;
  const tr = workoutTrend(data, sel, WEEKS, goal);
  if (tr.weeks.every((w) => w.sessions === 0)) return null;
  const dur = (min: number) => (min >= 60 ? t("foc.dur", { h: Math.floor(min / 60), m: min % 60 }) : t("foc.min", { m: min }));

  return (
    <section className="panel wtrend">
      <h3>{t("wt.title")}</h3>
      <div className="wt-sum">
        <div><small>{t("wt.met")}</small><b>{t("wt.metOf", { a: tr.metWeeks, b: tr.weeks.length })}</b></div>
        <div><small>{t("wt.avgWeek")}</small><b>{t("wo.times", { n: tr.avgSessions.toFixed(1) })}</b></div>
        <div><small>{t("wt.avgSession")}</small><b>{dur(tr.avgMinutes)}</b></div>
        {tr.topKind && <div><small>{t("wt.top")}</small><b>{t(`wo.k.${tr.topKind}` as Key)}</b></div>}
      </div>
      <div className="wt-bars" style={{ height: BAR_PX + 22 }}>
        <div className="wt-goal" style={{ bottom: 22 + (goal / tr.max) * BAR_PX }} aria-hidden="true"><span>{goal}</span></div>
        {tr.weeks.map((w) => (
          <div key={w.week} title={`${fmt.monthDay(w.week)} – ${fmt.monthDay(addDays(w.week, 6))}\n${t("wo.times", { n: w.sessions })} · ${dur(w.minutes)}`}>
            <i className={w.met ? "met" : ""} style={{ height: Math.max(w.sessions > 0 ? 4 : 2, (w.sessions / tr.max) * BAR_PX) }} />
            <span>{Number(w.week.slice(5, 7))}/{Number(w.week.slice(8))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
