"use client";
import type { Interval } from "@/lib/insights";
import { todayStr } from "@/lib/clientTime";
import EmotionContext from "./EmotionContext";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Data = { body: Interval[] };

/** What went together in the user's own records: which feelings come with exercise, spending and saving days, and body fat next to exercise. A tendency, not a cause. */
export default function Insights() {
  const { t, fmt } = useI18n();
  const { data } = useApi<Data>(`/api/stats/insights?today=${todayStr()}`);
  if (!data) return null;
  return (
    <>
      <EmotionContext spaced />
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
