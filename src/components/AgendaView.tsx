"use client";
import { addMonths, dow, monthStart } from "@/lib/dates";
import { useEvents } from "./useEvents";
import { hhmm } from "./TimeGrid";
import { useI18n } from "./I18n";

export default function AgendaView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const first = monthStart(date);
  const { events, error } = useEvents(first, addMonths(first, 1));
  const groups: [string, NonNullable<typeof events>][] = [];
  (events ?? []).forEach((e) => {
    const g = groups[groups.length - 1];
    if (g && g[0] === e.date) g[1].push(e); else groups.push([e.date, [e]]);
  });
  return (
    <div className="agenda">
      {error && <p className="error">{t("common.loadFail")}</p>}
      {events && groups.length === 0 && <p className="muted">{t("common.noEvents")}</p>}
      {groups.map(([d, list]) => (
        <section key={d}>
          <button className="agenda-day" onClick={() => onPickDay(d)}>
            <b>{Number(d.slice(8))}</b><span>{fmt.monthDay(d)} {fmt.weekdayLong(dow(d))}</span>
          </button>
          <ul>
            {list.map((e) => (
              <li key={e.id}>
                <a href={e.link} target="_blank" rel="noreferrer">
                  <i style={{ background: e.color }} />
                  <time>{e.allDay ? t("common.allDay") : `${hhmm(e.startMin)} - ${hhmm(e.endMin)}`}</time>
                  <b>{e.title || t("common.untitled")}</b>
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
