"use client";
import GCalLogo from "./GCalLogo";
import DayView from "./DayView";
import WeekView from "./WeekView";
import MonthEventView from "./MonthEventView";
import AgendaView from "./AgendaView";
import type { TaskItem } from "@/lib/types";

export const GMODES = [["DAY", "일"], ["WEEK", "주"], ["MONTH", "월"], ["AGENDA", "목록"]] as const;
export type GMode = (typeof GMODES)[number][0];

/** Day / week / month / agenda views drawn from the Google Calendar API (Google's own embed can't show a day view). */
export default function GoogleCalView({ sel, setSel, mode, setMode, tasks }: {
  sel: string; setSel: (d: string) => void; mode: GMode; setMode: (m: GMode) => void; tasks: TaskItem[];
}) {
  const pick = (d: string) => { setSel(d); setMode("DAY"); };
  return (
    <>
      <div className="sechead">
        <div className="tabs-t" role="tablist">
          {GMODES.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>
        <a className="btn gcal" href="https://calendar.google.com/calendar/u/0/r" target="_blank" rel="noreferrer">
          <GCalLogo size={18} />구글 캘린더에서 보기
        </a>
      </div>
      {mode === "DAY" && <DayView date={sel} tasks={tasks} />}
      {mode === "WEEK" && <WeekView date={sel} onPickDay={pick} />}
      {mode === "MONTH" && <MonthEventView date={sel} onPickDay={pick} />}
      {mode === "AGENDA" && <AgendaView date={sel} onPickDay={pick} />}
    </>
  );
}
