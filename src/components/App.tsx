"use client";
import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import type { MonthData } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import CalendarView from "./CalendarView";
import StatsView from "./StatsView";
import DiaryView from "./DiaryView";
import ExpenseView from "./ExpenseView";
import GoogleCalView, { type GMode } from "./GoogleCalView";
import Icon, { Brand } from "./Icon";

type Tab = "calendar" | "stats" | "diary" | "expense" | "google";
const TABS: { key: Tab; label: string; icon: "calendar" | "chart" | "book" | "wallet" | "external" }[] = [
  { key: "calendar", label: "달력", icon: "calendar" },
  { key: "stats", label: "통계", icon: "chart" },
  { key: "diary", label: "일기", icon: "book" },
  { key: "expense", label: "지출", icon: "wallet" },
  { key: "google", label: "구글 캘린더", icon: "external" },
];
export const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

export default function App({ googleReady }: { googleReady: boolean }) {
  const { status, data: session } = useSession();
  const [tab, setTab] = useState<Tab>("calendar");
  const [sel, setSel] = useState(todayStr());
  const ym = sel.slice(0, 7);
  const [month, setMonth] = useState<MonthData | null>(null);
  const [error, setError] = useState("");
  const [gmode, setGmode] = useState<GMode>("DAY");

  useEffect(() => {
    if (status === "loading") return;
    let live = true;
    setError("");
    fetch(`/api/month?ym=${ym}`).then(async (r) => {
      const j = await r.json();
      if (!live) return;
      r.ok ? setMonth(j) : setError(j.error ?? "불러오기 실패");
    });
    return () => { live = false; };
  }, [ym, status]);

  const shift = (n: number) => {
    if (tab === "google" && (gmode === "DAY" || gmode === "WEEK")) {
      setSel(new Date(new Date(sel + "T00:00:00Z").getTime() + n * (gmode === "DAY" ? 1 : 7) * 864e5).toISOString().slice(0, 10));
      return;
    }
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    setSel(next === todayStr().slice(0, 7) ? todayStr() : `${next}-01`);
  };
  const stats = useMemo(() => (month?.ym === ym ? computeStats(Object.values(month.days), todayStr()) : null), [month, ym]);
  const [y, m] = ym.split("-").map(Number);
  const sd = new Date(sel + "T00:00:00Z");
  const title = tab === "google" && gmode === "DAY"
    ? `${sd.getUTCMonth() + 1}월 ${sd.getUTCDate()}일 ${"일월화수목금토"[sd.getUTCDay()]}요일`
    : `${y}년 ${m}월`;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><Brand /><span>Achievee</span></div>
        <nav className="nav">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
              <Icon name={t.icon} /><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          {month?.demo && <span className="tag">데모</span>}
          {status === "authenticated"
            ? <button className="btn" onClick={() => signOut()}>로그아웃</button>
            : googleReady && <button className="btn primary" onClick={() => signIn("google")}>Google 연동</button>}
        </div>
      </aside>

      <main className="page">
        <header className="pagehead">
          <h1>{title}</h1>
          <div className="row gap-2">
            <button className="btn" onClick={() => setSel(todayStr())}>오늘</button>
            <button className="btn icon" onClick={() => shift(-1)} aria-label="이전 달"><Icon name="left" /></button>
            <button className="btn icon" onClick={() => shift(1)} aria-label="다음 달"><Icon name="right" /></button>
          </div>
        </header>
        {error && <p className="error">{error}</p>}
        {tab === "calendar" && <CalendarView ym={ym} month={month} stats={stats} sel={sel} setSel={setSel} />}
        {tab === "stats" && <StatsView stats={stats} month={month} />}
        {tab === "diary" && <DiaryView ym={ym} sel={sel} setSel={setSel} />}
        {tab === "google" && <GoogleCalView sel={sel} mode={gmode} setMode={setGmode} email={session?.user?.email} onSignIn={googleReady ? () => signIn("google") : undefined} />}
        {tab === "expense" && <ExpenseView ym={ym} sel={sel} setSel={setSel} />}
      </main>
    </div>
  );
}
