"use client";
import { useState } from "react";

const MODES = [["MONTH", "월"], ["WEEK", "주"], ["AGENDA", "목록"]] as const;
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/**
 * Google's official embed URL. Private calendars only render when the viewer is signed in to Google
 * in this browser (and third-party cookies aren't blocked).
 */
export default function GoogleCalView({ ym, email, onSignIn }: { ym: string; email?: string | null; onSignIn?: () => void }) {
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("MONTH");
  if (!email) {
    return (
      <div className="panel" style={{ alignItems: "flex-start" }}>
        <p>Google로 로그인하면 내 캘린더가 여기에 열려요.</p>
        {onSignIn && <button className="btn primary" onClick={onSignIn}>Google 연동</button>}
      </div>
    );
  }
  const [y, m] = ym.split("-").map(Number);
  const q = new URLSearchParams({
    src: email, ctz: "Asia/Seoul", hl: "ko", mode, showTitle: "0", showPrint: "0", showTabs: "0", showCalendars: "0", showTz: "0",
    dates: `${ymd(new Date(Date.UTC(y, m - 1, 1)))}/${ymd(new Date(Date.UTC(y, m, 1)))}`,
  });
  return (
    <>
      <div className="sechead">
        <div className="tabs-t" role="tablist">
          {MODES.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={mode === k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{label}</button>
          ))}
        </div>
        <a className="btn" href={`https://calendar.google.com/calendar/u/0/r`} target="_blank" rel="noreferrer">새 창에서 열기</a>
      </div>
      <iframe key={`${ym}-${mode}`} className="gframe" title="Google Calendar" src={`https://calendar.google.com/calendar/embed?${q}`} />
    </>
  );
}
