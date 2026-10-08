"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DayEvent } from "@/lib/types";
import { WD_KO, dow } from "@/lib/dates";
import { todayStr } from "./App";

const H = 56; // px per hour
export const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Column-pack overlapping events: each overlapping cluster shares one column count. */
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

export function nowMinutes(now: Date) {
  const f = (o: Intl.DateTimeFormatOptions) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hourCycle: "h23", ...o }).format(now));
  return f({ hour: "2-digit" }) * 60 + f({ minute: "2-digit" });
}

/** Hour-grid for one or more days (day view = 1 column, week view = 7). */
export default function TimeGrid({ days, events, error, onPickDay }: {
  days: string[]; events: DayEvent[] | null; error?: string; onPickDay?: (d: string) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const scroller = useRef<HTMLDivElement>(null);
  const today = todayStr();
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  const byDay = useMemo(() => {
    const m: Record<string, DayEvent[]> = Object.fromEntries(days.map((d) => [d, []]));
    (events ?? []).forEach((e) => m[e.date]?.push(e));
    return m;
  }, [days, events]);
  const anyAllDay = days.some((d) => byDay[d].some((e) => e.allDay));
  const nowMin = days.includes(today) ? nowMinutes(now) : -1;
  const multi = days.length > 1;
  const cols = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` };

  useEffect(() => {
    if (!events || !scroller.current) return;
    const first = events.filter((e) => !e.allDay).reduce((m, e) => Math.min(m, e.startMin), 8 * 60);
    scroller.current.scrollTop = Math.max(0, ((nowMin >= 0 ? nowMin : first) / 60) * H - 120);
  }, [events, days.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tlbox">
      <div className="tlscroll"><div className={multi ? "tlw multi" : "tlw"}>
        {multi && (
          <div className="tl-head">
            <span className="gut" />
            <div className="cols" style={cols}>
              {days.map((d) => (
                <button key={d} className={d === today ? "today" : ""} onClick={() => onPickDay?.(d)}>
                  <small className={dow(d) === 0 ? "sun" : dow(d) === 6 ? "sat" : ""}>{WD_KO[dow(d)]}</small>
                  <b>{Number(d.slice(8))}</b>
                </button>
              ))}
            </div>
          </div>
        )}
        {anyAllDay && (
          <div className="tl-allday">
            <span className="gut" />
            <div className="cols" style={cols}>
              {days.map((d) => (
                <div key={d}>
                  {byDay[d].filter((e) => e.allDay).map((e) => (
                    <a key={e.id} className="chipday" href={e.link} target="_blank" rel="noreferrer" style={{ ["--ev" as string]: e.color }}>{e.title}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {error && <p className="error" style={{ padding: 16 }}>{error}</p>}
        <div className="tl" ref={scroller}>
          <div className="tl-in" style={{ height: 24 * H }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="hour" style={{ top: h * H, height: H }}><span>{h === 0 ? "" : `${h}시`}</span></div>
            ))}
            <div className="tl-cols" style={cols}>
              {days.map((d) => (
                <div key={d} className="tl-col">
                  {layout(byDay[d].filter((e) => !e.allDay)).map(({ e, col, cols: n }) => (
                    <a key={e.id} className="ev" href={e.link} target="_blank" rel="noreferrer"
                      title={`${e.title}\n${hhmm(e.startMin)} - ${hhmm(e.endMin)}${e.location ? `\n${e.location}` : ""}\n${e.calendar}`}
                      style={{
                        top: (e.startMin / 60) * H, height: Math.max(((e.endMin - e.startMin) / 60) * H - 2, 22),
                        left: `calc(100% * ${col / n} + 1px)`, width: `calc(100% / ${n} - 3px)`, ["--ev" as string]: e.color,
                      }}>
                      <b>{e.title}</b>
                      {e.endMin - e.startMin >= 45 && <span>{hhmm(e.startMin)} - {hhmm(e.endMin)}</span>}
                    </a>
                  ))}
                  {d === today && nowMin >= 0 && <div className="nowline" style={{ top: (nowMin / 60) * H }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div></div>
    </div>
  );
}
