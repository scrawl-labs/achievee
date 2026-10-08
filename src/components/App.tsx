"use client";
import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import type { MonthData } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import CalendarView from "./CalendarView";
import StatsView from "./StatsView";
import DiaryView from "./DiaryView";
import ExpenseView from "./ExpenseView";

type Tab = "calendar" | "stats" | "diary" | "expense";
const TABS: [Tab, string][] = [["calendar", "달력"], ["stats", "통계"], ["diary", "일기"], ["expense", "지출"]];
const TZ = "Asia/Seoul";
export const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

export default function App({ googleReady }: { googleReady: boolean }) {
  const { status } = useSession();
  const [tab, setTab] = useState<Tab>("calendar");
  const [ym, setYm] = useState(todayStr().slice(0, 7));
  const [month, setMonth] = useState<MonthData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    let live = true;
    setMonth(null); setError("");
    fetch(`/api/month?ym=${ym}`).then(async (r) => {
      const j = await r.json();
      if (!live) return;
      r.ok ? setMonth(j) : setError(j.error ?? "불러오기 실패");
    });
    return () => { live = false; };
  }, [ym, status]);

  const shift = (n: number) => {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const stats = useMemo(() => (month ? computeStats(Object.values(month.days), todayStr()) : null), [month]);

  return (
    <main className="app">
      <header className="top">
        <h1>Achievee</h1>
        <div className="auth">
          {status === "authenticated"
            ? <button className="pill" onClick={() => signOut()}>로그아웃</button>
            : googleReady
              ? <button className="pill primary" onClick={() => signIn("google")}>Google 연동</button>
              : <span className="hint">Google 미설정 · 데모 데이터</span>}
        </div>
      </header>

      <div className="monthbar">
        <h2>{new Date(ym + "-01T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}</h2>
        <div>
          <button className="pill round" onClick={() => shift(-1)} aria-label="이전 달">‹</button>
          <button className="pill round" onClick={() => shift(1)} aria-label="다음 달">›</button>
        </div>
      </div>

      {month?.demo && <p className="banner">데모 데이터입니다. Google로 로그인하면 내 Tasks/캘린더로 바뀝니다.</p>}
      {error && <p className="banner err">{error}</p>}

      <section className="content">
        {tab === "calendar" && <CalendarView ym={ym} month={month} stats={stats} />}
        {tab === "stats" && <StatsView stats={stats} month={month} />}
        {tab === "diary" && <DiaryView ym={ym} />}
        {tab === "expense" && <ExpenseView ym={ym} />}
      </section>

      <nav className="tabs">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>
    </main>
  );
}
