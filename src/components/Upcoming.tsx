"use client";
import { Button } from "@achievee/ui";
import { useEffect, useMemo, useState } from "react";
import { addDays } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import { eventSource } from "@/lib/calendarSources";
import { ddayLabel, selectUpcoming, UPCOMING_DAYS, UPCOMING_MAX } from "@/lib/upcoming";
import { useEvents } from "./useEvents";
import { hhmm, nowMinutes } from "./TimeGrid";
import { useI18n } from "./I18n";
import Icon from "./Icon";

/**
 * The next two weeks at the top of the Log tab, so a plan booked for next week shows up while writing today's to-dos.
 * A row opens that day in the Calendar tab; `onOpen(date, "AGENDA")` is the "see all" list.
 */
/** Phones list fewer rows, so the month is still near the top of the Home tab. */
function useRowCap() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 860px)");
    const read = () => setNarrow(q.matches);
    read(); q.addEventListener("change", read);
    return () => q.removeEventListener("change", read);
  }, []);
  return narrow ? 3 : UPCOMING_MAX;
}

export default function Upcoming({ onOpen }: { onOpen: (date: string, mode: "DAY" | "AGENDA", kind?: "appointment") => void }) {
  const { t, fmt } = useI18n();
  const today = todayStr();
  const { events, error } = useEvents(today, addDays(today, UPCOMING_DAYS));
  const cap = useRowCap();
  const up = useMemo(() => (events ? selectUpcoming(events, today, nowMinutes(new Date()), UPCOMING_DAYS, cap) : null), [events, today, cap]);
  const rest = up ? [up.more > 0 && t("g.more", { n: up.more }), up.google > 0 && t("up.google", { n: up.google })].filter(Boolean).join(" · ") : "";

  return (
    <section className="upcoming" aria-labelledby="up-title">
      <div className="up-head">
        <h4 id="up-title">{t("up.title")} <small>{t("up.sub")}</small></h4>
        <Button variant="ghost" className="up-add" type="button" onClick={() => onOpen(today, "DAY", "appointment")}><Icon name="plus" size={14} />{t("up.add")}</Button>
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
