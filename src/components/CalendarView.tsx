"use client";
import { useEffect, useState } from "react";
import type { MonthData, Stats } from "@/lib/types";
import { todayStr } from "./App";
import Summary from "./Summary";

const WD = ["월", "화", "수", "목", "금", "토", "일"];
const WD_LONG = ["일", "월", "화", "수", "목", "금", "토"];

/** 0 = no tasks, 1..4 = completion ratio buckets */
const level = (done: number, total: number) => {
  if (!total) return 0;
  const r = done / total;
  return r === 1 ? 4 : r >= 0.6 ? 3 : r >= 0.3 ? 2 : 1;
};
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

type Props = { ym: string; month: MonthData | null; stats: Stats | null; sel: string; setSel: (d: string) => void };

export default function CalendarView({ ym, month, stats, sel, setSel }: Props) {
  const [y, m] = ym.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = todayStr();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const data = month?.ym === ym ? month : null;
  const day = data?.days[sel];

  const [diary, setDiary] = useState<{ date: string; body: string }[]>([]);
  const [spent, setSpent] = useState<{ date: string; amount: number }[]>([]);
  useEffect(() => {
    fetch(`/api/diary?ym=${ym}`).then((r) => r.json()).then(setDiary);
    fetch(`/api/expenses?ym=${ym}`).then((r) => r.json()).then(setSpent);
  }, [ym]);
  const note = diary.find((d) => d.date === sel)?.body;
  const daySpent = spent.filter((s) => s.date === sel).reduce((a, s) => a + s.amount, 0);
  const sd = new Date(sel + "T00:00:00Z");

  return (
    <>
      <Summary items={[
        ["달성률", stats ? `${Math.round(stats.rate * 100)}%` : "-"],
        ["완료", stats ? `${stats.doneTotal} / ${stats.taskTotal}` : "-"],
        ["연속 달성", stats ? `${stats.streak}일` : "-"],
      ]} />
      <div className="workspace">
        <div className="cal">
          <div className="cal-head">{WD.map((w, i) => <span key={w} className={i === 5 ? "sat" : i === 6 ? "sun" : ""}>{w}</span>)}</div>
          <div className="cal-grid">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} className="cell empty" />;
              const date = `${ym}-${String(d).padStart(2, "0")}`;
              const v = data?.days[date];
              const col = i % 7;
              return (
                <button key={i} className={`cell${date === sel ? " sel" : ""}`} onClick={() => setSel(date)}>
                  <span className={`dnum${col === 5 ? " sat" : col === 6 ? " sun" : ""}${date === today ? " today" : ""}`}>{d}</span>
                  <span className={`stamp l${v ? level(v.done, v.total) : 0}`}>{v && v.total ? v.done : ""}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="detail">
          <h2>{sd.getUTCMonth() + 1}월 {sd.getUTCDate()}일 <small>{WD_LONG[sd.getUTCDay()]}요일</small></h2>
          <div className="big">{day ? `${day.done}` : "-"}<span> / {day ? day.total : "-"}</span></div>
          <div className="meter"><i style={{ width: day && day.total ? `${(day.done / day.total) * 100}%` : 0 }} /></div>
          <ul className="facts">
            <li><span>일정</span><b>{day ? day.events : "-"}</b></li>
            <li><span>지출</span><b>{daySpent ? won(daySpent) : "-"}</b></li>
          </ul>
          {note && <p className="note">{note}</p>}
        </aside>
      </div>
    </>
  );
}
