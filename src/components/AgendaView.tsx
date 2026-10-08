"use client";
import { WD_KO, addMonths, dow, monthStart } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { hhmm } from "./TimeGrid";

export default function AgendaView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const first = monthStart(date);
  const { events, error } = useEvents(first, addMonths(first, 1));
  const groups: [string, NonNullable<typeof events>][] = [];
  (events ?? []).forEach((e) => {
    const g = groups[groups.length - 1];
    if (g && g[0] === e.date) g[1].push(e); else groups.push([e.date, [e]]);
  });
  return (
    <div className="agenda">
      {error && <p className="error">{error}</p>}
      {events && groups.length === 0 && <p className="muted">일정이 없어요</p>}
      {groups.map(([d, list]) => (
        <section key={d}>
          <button className="agenda-day" onClick={() => onPickDay(d)}>
            <b>{Number(d.slice(8))}</b><span>{Number(d.slice(5, 7))}월 {WD_KO[dow(d)]}요일</span>
          </button>
          <ul>
            {list.map((e) => (
              <li key={e.id}>
                <a href={e.link} target="_blank" rel="noreferrer">
                  <i style={{ background: e.color }} />
                  <time>{e.allDay ? "종일" : `${hhmm(e.startMin)} - ${hhmm(e.endMin)}`}</time>
                  <b>{e.title}</b>
                  <small>{e.calendar}</small>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
