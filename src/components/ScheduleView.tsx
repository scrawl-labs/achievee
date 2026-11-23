"use client";
import { Tabs } from "@achievee/ui";
import GCalLogo from "./GCalLogo";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthEventView from "./MonthEventView";
import AgendaView from "./AgendaView";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { startGoogleConnect, useGoogleStatus } from "./useGoogleStatus";

export const GMODES: readonly (readonly [string, Key])[] = [["DAY", "g.day"], ["WEEK", "g.week"], ["MONTH", "g.month"], ["AGENDA", "g.agenda"]];
export type GMode = "DAY" | "WEEK" | "MONTH" | "AGENDA";

/** Our calendar: day / week / month / agenda views. Events arrive through useEvents -> mergeEvents (today: Google only, drawn from its API since the embed has no day view). */
export default function ScheduleView({ sel, setSel, mode, setMode, onCalendars }: {
  sel: string; setSel: (d: string) => void; mode: GMode; setMode: (m: GMode) => void;
  onCalendars?: () => void; // where the Google calendars to show are chosen
}) {
  const { t } = useI18n();
  const { status } = useGoogleStatus();
  const linkKey: Key | null = status === "none" ? "gc.connect" : status === "revoked" ? "gc.linkRevoked" : null; // connected / still loading: nothing, so no flash
  const pick = (d: string) => { setSel(d); setMode("DAY"); };
  return (
    <>
      <div className="sechead">
        <Tabs value={mode} onChange={setMode} items={GMODES.map(([k, label]) => ({ value: k as GMode, label: t(label) }))} />
        <a className="btn gcal" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer">
          <GCalLogo size={18} />{t("g.open")}
        </a>
      </div>
      {linkKey && <button type="button" className="glink" onClick={startGoogleConnect}>{t(linkKey)}</button>}
      {/* own events are drawn solid, Google ones light: the key, and (connected) where to hide Google calendars */}
      <div className="evlegend">
        <span className="own"><i />{t("g.own")}</span>
        {status === "connected" && <>
          <span className="gcal"><i />{t("g.google")}</span>
          {onCalendars && <button type="button" className="linkish" onClick={onCalendars}>{t("g.pickCals")}</button>}
        </>}
      </div>
      {mode === "DAY" && <DayView date={sel} />}
      {mode === "WEEK" && <WeekView date={sel} onPickDay={pick} />}
      {mode === "MONTH" && <MonthEventView date={sel} onPickDay={pick} />}
      {mode === "AGENDA" && <AgendaView date={sel} onPickDay={pick} />}
    </>
  );
}
