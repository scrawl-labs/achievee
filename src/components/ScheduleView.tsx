"use client";
import type { EventKind } from "@/lib/nativeEvents";
import { Button, ButtonLink, Tabs } from "@achievee/ui";
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
export default function ScheduleView({ sel, setSel, mode, setMode, onCalendars, newKind }: {
  sel: string; setSel: (d: string) => void; mode: GMode; setMode: (m: GMode) => void;
  onCalendars?: () => void; // where the Google calendars to show are chosen
  newKind?: EventKind; // the kind a new own event starts as (appointment when opened from Upcoming's "add")
}) {
  const { t } = useI18n();
  const { status } = useGoogleStatus();
  const linkKey: Key | null = status === "none" ? "gc.connect" : status === "revoked" ? "gc.linkRevoked" : null; // connected / still loading: nothing, so no flash
  const pick = (d: string) => { setSel(d); setMode("DAY"); };
  return (
    <>
      {/* one row: the views on the left, the Google actions on the right (on phones the Google link is just its logo) */}
      <div className="sechead sched-bar">
        <Tabs value={mode} onChange={setMode} items={GMODES.map(([k, label]) => ({ value: k as GMode, label: t(label) }))} />
        <div className="sched-actions">
          {status === "connected" && onCalendars && <Button variant="ghost" size="sm" onClick={onCalendars}>{t("g.pickCals")}</Button>}
          <ButtonLink variant="ghost" size="sm" className="gcal" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer" aria-label={t("g.open")} title={t("g.open")}>
            <GCalLogo size={16} /><span className="gcal-label">{t("g.open")}</span>
          </ButtonLink>
        </div>
      </div>
      {linkKey && <button type="button" className="glink" onClick={startGoogleConnect}>{t(linkKey)}</button>}
      {mode === "DAY" && <DayView date={sel} newKind={newKind} onPickDay={setSel} />}
      {mode === "WEEK" && <WeekView date={sel} onPickDay={pick} newKind={newKind} />}
      {mode === "MONTH" && <MonthEventView date={sel} onPickDay={pick} />}
      {mode === "AGENDA" && <AgendaView date={sel} onPickDay={pick} />}
    </>
  );
}
