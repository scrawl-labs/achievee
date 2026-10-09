"use client";
import type { MonthData, Stats } from "@/lib/types";
import Summary from "./Summary";
import { levelOf } from "@/lib/level";
import { useI18n } from "./I18n";

const pct = (n: number) => `${Math.round(n * 100)}%`;
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export default function StatsView({ stats, month }: { stats: Stats | null; month: MonthData | null }) {
  const { t, fmt } = useI18n();
  if (!stats || !month) return null;
  const days = Object.values(month.days);
  const events = days.reduce((s, d) => s + d.events, 0);
  return (
    <>
      <Summary items={[
        [t("cal.rate"), pct(stats.rate)], [t("stats.bestStreak"), t("cal.days", { n: stats.bestStreak })],
        [t("stats.mostDone"), stats.bestDay ? t("stats.count", { n: stats.bestDay.done }) : "-"], [t("stats.events"), `${events}`],
      ]} />
      <div className="two">
        <section className="panel">
          <h3>{t("stats.weekday")}</h3>
          <div className="vbars">
            {stats.byWeekday.map((w, i) => (
              <div key={i}><div className="track"><i className={`l${levelOf(w.rate, 1)}`} style={{ height: pct(w.rate) }} /></div><span>{fmt.weekdayShort(MON_FIRST[i])}</span><em>{pct(w.rate)}</em></div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>{t("stats.daily")}</h3>
          <div className="daily">
            {days.map((d) => (
              <div key={d.date} title={`${d.date}  ${d.done}/${d.total}`}>
                <i style={{ height: d.total ? pct(d.done / d.total) : "2px" }} className={d.total ? `l${levelOf(d.done, d.total)}` : "off"} />
              </div>
            ))}
          </div>
          <div className="axis"><span>1</span><span>{days.length}</span></div>
        </section>
      </div>
    </>
  );
}
