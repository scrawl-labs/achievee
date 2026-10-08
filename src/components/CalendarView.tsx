"use client";
import type { MonthData, Stats } from "@/lib/types";
import { todayStr } from "./App";

const WD = ["M", "T", "W", "T", "F", "S", "S"];

/** 0 → grey, then red → amber → green as the completion ratio rises. */
function tone(done: number, total: number) {
  if (!total) return "none";
  const r = done / total;
  return r === 1 ? "full" : r >= 0.6 ? "high" : r >= 0.3 ? "mid" : "low";
}

export default function CalendarView({ ym, month, stats }: { ym: string; month: MonthData | null; stats: Stats | null }) {
  const [y, m] = ym.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = todayStr();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];

  return (
    <>
      {stats && (
        <div className="summary">
          <div><b>{Math.round(stats.rate * 100)}%</b><span>이번 달 달성률</span></div>
          <div><b>{stats.doneTotal}/{stats.taskTotal}</b><span>완료 태스크</span></div>
          <div><b>{stats.streak}일</b><span>연속 달성</span></div>
        </div>
      )}
      <div className="grid head">
        {WD.map((w, i) => <div key={i} className={i === 5 ? "sat" : i === 6 ? "sun" : ""}>{w}</div>)}
      </div>
      <div className="grid">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const date = `${ym}-${String(d).padStart(2, "0")}`;
          const day = month?.days[date];
          const col = i % 7;
          return (
            <div key={i} className="cell" title={day ? `${day.done}/${day.total} 완료 · 일정 ${day.events}` : ""}>
              <div className={`badge ${day ? tone(day.done, day.total) : "none"}`}>{day && day.total ? day.done : "·"}</div>
              <div className={`num ${col === 5 ? "sat" : col === 6 ? "sun" : ""} ${date === today ? "today" : ""}`}>{d}</div>
            </div>
          );
        })}
      </div>
      <p className="legend">
        뱃지 = 완료한 태스크 수 · <i className="badge none" />0 <i className="badge low" />낮음 <i className="badge mid" />중간 <i className="badge high" />높음 <i className="badge full" />전부 완료
      </p>
    </>
  );
}
