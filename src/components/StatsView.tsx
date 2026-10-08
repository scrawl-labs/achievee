"use client";
import type { MonthData, Stats } from "@/lib/types";
import Summary from "./Summary";

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function StatsView({ stats, month }: { stats: Stats | null; month: MonthData | null }) {
  if (!stats || !month) return null;
  const days = Object.values(month.days);
  const events = days.reduce((s, d) => s + d.events, 0);
  return (
    <>
      <Summary items={[
        ["달성률", pct(stats.rate)], ["최장 연속", `${stats.bestStreak}일`],
        ["최다 완료", stats.bestDay ? `${stats.bestDay.done}개` : "-"], ["일정", `${events}`],
      ]} />
      <div className="two">
        <section className="panel">
          <h3>요일</h3>
          <div className="vbars">
            {stats.byWeekday.map((w) => (
              <div key={w.label}><div className="track"><i style={{ height: pct(w.rate) }} /></div><span>{w.label}</span><em>{pct(w.rate)}</em></div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>일별</h3>
          <div className="daily">
            {days.map((d) => (
              <div key={d.date} title={`${d.date}  ${d.done}/${d.total}`}>
                <i style={{ height: d.total ? pct(d.done / d.total) : "2px" }} className={d.total ? "" : "off"} />
              </div>
            ))}
          </div>
          <div className="axis"><span>1</span><span>{days.length}</span></div>
        </section>
      </div>
    </>
  );
}
