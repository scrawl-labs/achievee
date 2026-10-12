"use client";
import type { DayEvent } from "@/lib/types";
import { WORK_END, WORK_START, focusByDay } from "@/lib/focus";
import { addDays } from "@/lib/dates";
import { browserTz } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

const WINDOW = WORK_END - WORK_START;
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Meeting and focus time of the month, from the calendar events the app already reads. Nothing new is requested or stored. */
export default function FocusStats({ ym }: { ym: string }) {
  const { t } = useI18n();
  const from = `${ym}-01`;
  const to = addDays(from, 31).slice(0, 8) + "01"; // first day of next month
  const events = useApi<DayEvent[]>(`/api/events?from=${from}&to=${to}&tz=${encodeURIComponent(browserTz())}`).data;
  if (!events) return null;
  const days = focusByDay(events);
  if (days.length === 0) return null;

  const dur = (min: number) => (min >= 60 ? t("foc.dur", { h: Math.floor(min / 60), m: min % 60 }) : t("foc.min", { m: min }));
  const pct = (n: number) => `${(n / WINDOW) * 100}%`;
  const meetingTotal = days.reduce((s, d) => s + d.meetingMin, 0);

  return (
    <section className="panel focusstats">
      <h3>{t("foc.title")}</h3>
      <div className="focus-sum">
        <div><small>{t("foc.total")}</small><b>{dur(meetingTotal)}</b></div>
        <div><small>{t("foc.avgMeeting")}</small><b>{dur(avg(days.map((d) => d.meetingMin)))}</b></div>
        <div><small>{t("foc.avgFocus")}</small><b>{dur(avg(days.map((d) => d.focusMin)))}</b></div>
        <div><small>{t("foc.longest")}</small><b>{dur(Math.max(...days.map((d) => d.longestMin)))}</b></div>
      </div>
      <div className="focus-days">
        {days.map((d) => (
          <div key={d.date} title={`${d.date}  ${t("foc.legendMeeting")} ${dur(d.meetingMin)} · ${t("foc.legendFocus")} ${dur(d.focusMin)}`}>
            <div className="ftrack">
              <i className="focus-free" style={{ height: pct(d.focusMin) }} />
              <i className="focus-other" style={{ height: pct(d.otherMin) }} />
              <i className="focus-meet" style={{ height: pct(d.meetingMin) }} />
            </div>
            <span>{Number(d.date.slice(8))}</span>
          </div>
        ))}
      </div>
      <div className="focus-legend">
        <span><i className="focus-meet" />{t("foc.legendMeeting")}</span>
        <span><i className="focus-other" />{t("foc.legendOther")}</span>
        <span><i className="focus-free" />{t("foc.legendFocus")}</span>
      </div>
      <small className="muted">{t("foc.note")}</small>
    </section>
  );
}
