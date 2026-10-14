"use client";
import GCalLogo from "./GCalLogo";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthEventView from "./MonthEventView";
import AgendaView from "./AgendaView";
import type { TaskItem } from "@/lib/types";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { startGoogleConnect, useGoogleStatus } from "./useGoogleStatus";

export const GMODES: readonly (readonly [string, Key])[] = [["DAY", "g.day"], ["WEEK", "g.week"], ["MONTH", "g.month"], ["AGENDA", "g.agenda"]];
export type GMode = "DAY" | "WEEK" | "MONTH" | "AGENDA";

/** Our calendar: day / week / month / agenda views. Events arrive through useEvents -> mergeEvents (today: Google only, drawn from its API since the embed has no day view). */
export default function ScheduleView({ sel, setSel, mode, setMode, tasks }: {
  sel: string; setSel: (d: string) => void; mode: GMode; setMode: (m: GMode) => void; tasks: TaskItem[];
}) {
  const { t } = useI18n();
  const { status } = useGoogleStatus();
  const linkKey: Key | null = status === "none" ? "gc.connect" : status === "revoked" ? "gc.linkRevoked" : null; // connected / still loading: nothing, so no flash
  const pick = (d: string) => { setSel(d); setMode("DAY"); };
  return (
    <>
      <div className="sechead">
        <div className="tabs-t" role="tablist">
          {GMODES.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => setMode(k as GMode)}>{t(label)}</button>
          ))}
        </div>
        <a className="btn gcal" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer">
          <GCalLogo size={18} />{t("g.open")}
        </a>
      </div>
      {linkKey && <button type="button" className="glink" onClick={startGoogleConnect}>{t(linkKey)}</button>}
      {mode === "DAY" && <DayView date={sel} tasks={tasks} />}
      {mode === "WEEK" && <WeekView date={sel} onPickDay={pick} />}
      {mode === "MONTH" && <MonthEventView date={sel} onPickDay={pick} />}
      {mode === "AGENDA" && <AgendaView date={sel} onPickDay={pick} />}
    </>
  );
}
