"use client";
import { moodVerdict, MIN_DAYS_PER_GROUP, type Comparison, type Interval } from "@/lib/insights";
import { todayStr } from "@/lib/clientTime";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Data = { patterns: { exercise: Comparison; waste: Comparison }; body: Interval[]; windowDays: number };

/** What went together in the user's own records. Said carefully: a tendency, not a cause, and nothing until there are enough days. */
export default function Insights() {
  const { t, fmt } = useI18n();
  const { data } = useApi<Data>(`/api/stats/insights?today=${todayStr()}`);
  if (!data) return null;
  const { exercise, waste } = data.patterns;
  const anyMood = exercise.yes.days + exercise.no.days > 0;
  const one = (n: number | null) => (n === null ? "-" : n.toFixed(1));

  const row = (c: Comparison, label: Key, yes: Key, no: Key, subject: Key) => {
    const v = c.diff === null ? null : moodVerdict(c.diff);
    return (
      <div className="pt-row" key={label}>
        <b>{t(label)}</b>
        <div className="pt-groups">
          <div><small>{t(yes)}</small><strong>{one(c.yes.mood)}</strong><em>{t("pt.days", { n: c.yes.days })}</em></div>
          <div><small>{t(no)}</small><strong>{one(c.no.mood)}</strong><em>{t("pt.days", { n: c.no.days })}</em></div>
        </div>
        <small className={c.enough ? "pt-verdict" : "muted"}>
          {!c.enough || v === null ? t("pt.need", { n: MIN_DAYS_PER_GROUP })
            : v === "none" ? t("pt.same")
            : t(v === "up" ? "pt.up" : "pt.down", { label: t(subject), d: Math.abs(c.diff!).toFixed(1) })}
        </small>
      </div>
    );
  };

  return (
    <>
      {anyMood && (
        <section className="panel pattern">
          <h3>{t("pt.title")}</h3>
          {row(exercise, "pt.exercise", "pt.exYes", "pt.exNo", "pt.exSubject")}
          {row(waste, "pt.waste", "pt.wsYes", "pt.wsNo", "pt.wsSubject")}
          <small className="muted">{t("pt.note", { n: data.windowDays })}</small>
        </section>
      )}
      {data.body.length > 0 && (
        <section className="panel pattern">
          <h3>{t("bw.title")}</h3>
          <div className="bw-rows">
            {data.body.map((i) => (
              <div className="bw-row" key={i.to}>
                <span>{fmt.monthDay(i.from)} → {fmt.monthDay(i.to)}</span>
                <b className={i.fatChange < 0 ? "down" : i.fatChange > 0 ? "up" : ""}>{t("bw.fat", { d: `${i.fatChange > 0 ? "+" : i.fatChange < 0 ? "−" : ""}${(Math.abs(i.fatChange) / 10).toFixed(1)}` })}</b>
                <em>{t("bw.perWeek", { n: i.perWeek.toFixed(1) })}</em>
              </div>
            ))}
          </div>
          <small className="muted">{t("bw.note")}</small>
        </section>
      )}
    </>
  );
}
