"use client";
import { useMemo } from "react";
import { addDays } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import { eventSource } from "@/lib/calendarSources";
import { ddayLabel, selectUpcoming, UPCOMING_DAYS } from "@/lib/upcoming";
import { useEvents } from "./useEvents";
import { hhmm, nowMinutes } from "./TimeGrid";
import { useI18n } from "./I18n";
import Icon from "./Icon";

/**
 * The next two weeks at the top of the Log tab, so a plan booked for next week shows up while writing today's to-dos.
 * A row opens that day in the Calendar tab; `onOpen(date, "AGENDA")` is the "see all" list.
 */
export default function Upcoming({ onOpen }: { onOpen: (date: string, mode: "DAY" | "AGENDA") => void }) {
  const { t, fmt } = useI18n();
  const today = todayStr();
  const { events, error } = useEvents(today, addDays(today, UPCOMING_DAYS));
  const up = useMemo(() => (events ? selectUpcoming(events, today, nowMinutes(new Date())) : null), [events, today]);
  const rest = up ? [up.more > 0 && t("g.more", { n: up.more }), up.google > 0 && t("up.google", { n: up.google })].filter(Boolean).join(" · ") : "";

  return (
    <section className="upcoming" aria-labelledby="up-title">
      <div className="up-head">
        <h4 id="up-title">{t("up.title")} <small>{t("up.sub")}</small></h4>
        <button type="button" className="btn ghost up-add" onClick={() => onOpen(today, "DAY")}><Icon name="plus" size={14} />{t("up.add")}</button>
      </div>
      {error && <p className="error">{t("common.loadFail")}</p>}
      {up && up.rows.length === 0 && !rest && (
        <div className="up-empty">
          <p>{t("up.empty")}</p>
          <small className="muted">{t("up.emptyHint")}</small>
        </div>
      )}
      {up && up.rows.length > 0 && (
        <ul>
          {up.rows.map((e) => {
            const d = ddayLabel(e.date, today);
            const own = eventSource(e) === "native";
            return (
              <li key={e.id}>
                <button type="button" className={`up-row${own ? " own" : " gcal"}`} style={own ? undefined : { ["--ev" as string]: e.color }}
                  aria-label={`${e.title || t("common.untitled")} · ${t("up.open", { day: fmt.shortDay(e.date) })}`} onClick={() => onOpen(e.date, "DAY")}>
                  <span className={`dday${d.key === "up.today" ? " now" : d.key === "up.tomorrow" ? " soon" : ""}`}>{t(d.key, { n: d.n ?? 0 })}</span>
                  <b>{e.title || t("common.untitled")}</b>
                  <time>{fmt.shortDay(e.date)} · {e.allDay ? t("common.allDay") : hhmm(e.startMin)}</time>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {rest && <button type="button" className="up-more" onClick={() => onOpen(today, "AGENDA")}>{rest} · {t("up.seeAll")}</button>}
    </section>
  );
}
