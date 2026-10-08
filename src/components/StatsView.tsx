"use client";
import type { MonthData, Stats } from "@/lib/types";

export default function StatsView({ stats, month }: { stats: Stats | null; month: MonthData | null }) {
  if (!stats || !month) return <p className="hint">불러오는 중…</p>;
  const events = Object.values(month.days).reduce((s, d) => s + d.events, 0);
  return (
    <div className="stack">
      <div className="summary">
        <div><b>{Math.round(stats.rate * 100)}%</b><span>달성률</span></div>
        <div><b>{stats.bestStreak}일</b><span>최장 연속</span></div>
        <div><b>{events}</b><span>일정 수</span></div>
      </div>
      <div className="card">
        <h3>요일별 달성률</h3>
        {stats.byWeekday.map((w) => (
          <div className="bar" key={w.label}>
            <span>{w.label}</span>
            <div><i style={{ width: `${Math.round(w.rate * 100)}%` }} /></div>
            <em>{Math.round(w.rate * 100)}%</em>
          </div>
        ))}
      </div>
      {stats.bestDay && (
        <div className="card">
          <h3>가장 많이 해낸 날</h3>
          <p>{stats.bestDay.date} · {stats.bestDay.done}개 완료 (전체 {stats.bestDay.total}개)</p>
        </div>
      )}
      <p className="hint">성공한 날 = 그날 태스크의 80% 이상 완료. 완료 여부는 Google Tasks 기준입니다.</p>
    </div>
  );
}
