"use client";
import GCalLogo from "./GCalLogo";

export const GMODES = [["DAY", "일"], ["WEEK", "주"], ["MONTH", "월"], ["AGENDA", "목록"]] as const;
export type GMode = (typeof GMODES)[number][0];

const compact = (iso: string) => iso.replace(/-/g, "");
const addDays = (iso: string, n: number) => new Date(new Date(iso + "T00:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);

/**
 * Google's official embed URL. Private calendars only render when the viewer is signed in to Google
 * in this browser (and third-party cookies aren't blocked).
 */
export default function GoogleCalView({ sel, mode, setMode, email, onSignIn }: {
  sel: string; mode: GMode; setMode: (m: GMode) => void; email?: string | null; onSignIn?: () => void;
}) {
  if (!email) {
    return (
      <div className="panel" style={{ alignItems: "flex-start" }}>
        <p>Google로 로그인하면 내 캘린더가 여기에 열려요.</p>
        {onSignIn && <button className="btn primary" onClick={onSignIn}>Google 연동</button>}
      </div>
    );
  }
  const first = `${sel.slice(0, 7)}-01`;
  const span = mode === "DAY" ? [sel, addDays(sel, 1)] : mode === "WEEK" ? [sel, addDays(sel, 7)] : [first, addDays(first, 31)];
  const q = new URLSearchParams({
    src: email, ctz: "Asia/Seoul", hl: "ko", mode, showTitle: "0", showPrint: "0", showTabs: "0", showCalendars: "0", showTz: "0",
    dates: `${compact(span[0])}/${compact(span[1])}`,
  });
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
      <iframe key={`${sel}-${mode}`} className="gframe" title="Google Calendar" src={`https://calendar.google.com/calendar/embed?${q}`} />
    </>
  );
}
