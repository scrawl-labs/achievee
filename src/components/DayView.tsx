"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DayEvent, TaskItem } from "@/lib/types";
import { todayStr } from "./App";

const H = 56; // px per hour
const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Column-pack overlapping events: each cluster shares one column count. */
function layout(events: DayEvent[]) {
  const res: { e: DayEvent; col: number; cols: number }[] = [];
  let cluster: { e: DayEvent; col: number }[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(1, ...cluster.map((c) => c.col + 1));
    cluster.forEach((c) => res.push({ ...c, cols }));
    cluster = [];
  };
  for (const e of events) {
    if (cluster.length && e.startMin >= clusterEnd) { flush(); clusterEnd = -1; }
    const used = cluster.filter((c) => c.e.endMin > e.startMin).map((c) => c.col);
    let col = 0;
    while (used.includes(col)) col++;
    cluster.push({ e, col });
    clusterEnd = Math.max(clusterEnd, e.endMin);
  }
  flush();
  return res;
}

export default function DayView({ date, tasks }: { date: string; tasks: TaskItem[] }) {
  const [events, setEvents] = useState<DayEvent[] | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    setEvents(null); setError("");
    fetch(`/api/day?date=${date}`).then(async (r) => {
      const j = await r.json();
      if (!live) return;
      r.ok ? setEvents(j) : setError(j.error ?? "불러오기 실패");
    });
    return () => { live = false; };
  }, [date]);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  const timed = useMemo(() => layout((events ?? []).filter((e) => !e.allDay)), [events]);
  const allDay = (events ?? []).filter((e) => e.allDay);

  const isToday = date === todayStr();
  const nowMin = isToday
    ? Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", hourCycle: "h23" }).format(now)) * 60 +
      Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", minute: "2-digit" }).format(now))
    : -1;

  useEffect(() => {
    if (!events || !scroller.current) return;
    const focus = nowMin >= 0 ? nowMin : events.filter((e) => !e.allDay)[0]?.startMin ?? 8 * 60;
    scroller.current.scrollTop = Math.max(0, (focus / 60) * H - 120);
  }, [events, date]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dayview">
      <div className="tlbox">
        {allDay.length > 0 && (
          <div className="allday">
            {allDay.map((e) => (
              <a key={e.id} className="chipday" href={e.link} target="_blank" rel="noreferrer" style={{ ["--ev" as string]: e.color }}>{e.title}</a>
            ))}
          </div>
        )}
        {error && <p className="error" style={{ padding: 16 }}>{error}</p>}
        <div className="tl" ref={scroller}>
          <div className="tl-in" style={{ height: 24 * H }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="hour" style={{ top: h * H, height: H }}><span>{h === 0 ? "" : `${h}시`}</span></div>
            ))}
            {timed.map(({ e, col, cols }) => (
              <a key={e.id} className="ev" href={e.link} target="_blank" rel="noreferrer"
                title={`${e.title}\n${hh(e.startMin)} - ${hh(e.endMin)}${e.location ? `\n${e.location}` : ""}\n${e.calendar}`}
                style={{
                  top: (e.startMin / 60) * H, height: Math.max(((e.endMin - e.startMin) / 60) * H - 2, 22),
                  left: `calc(56px + (100% - 64px) * ${col / cols})`, width: `calc((100% - 64px) / ${cols} - 3px)`,
                  ["--ev" as string]: e.color,
                }}>
                <b>{e.title}</b>
                {e.endMin - e.startMin >= 45 && <span>{hh(e.startMin)} - {hh(e.endMin)}</span>}
              </a>
            ))}
            {nowMin >= 0 && <div className="nowline" style={{ top: (nowMin / 60) * H }} />}
          </div>
        </div>
      </div>
      <aside className="daytasks">
        <h3>할 일</h3>
        {tasks.length === 0 ? <p className="muted">없음</p> : (
          <ul className="tasks">
            {tasks.map((t, i) => <li key={i} className={t.done ? "done" : ""}><span className="check" aria-hidden="true" />{t.title}</li>)}
          </ul>
        )}
      </aside>
    </div>
  );
}
