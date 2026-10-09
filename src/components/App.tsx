"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import type { MonthData } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { addDays, mondayOf } from "@/lib/dates";
import { browserTz, todayStr } from "@/lib/clientTime";
import type { Key } from "@/lib/i18n";
import CalendarView from "./CalendarView";
import StatsView from "./StatsView";
import DiaryView from "./DiaryView";
import ExpenseView from "./ExpenseView";
import GoogleCalView, { type GMode } from "./GoogleCalView";
import Icon, { Brand } from "./Icon";
import LanguageSelect from "./LanguageSelect";
import { useI18n } from "./I18n";
import { prefetch, useApi } from "./useApi";

type Tab = "calendar" | "stats" | "diary" | "expense" | "google";
const TABS: { key: Tab; label: Key; icon: "calendar" | "chart" | "book" | "wallet" | "external" }[] = [
  { key: "calendar", label: "nav.calendar", icon: "calendar" },
  { key: "stats", label: "nav.stats", icon: "chart" },
  { key: "diary", label: "nav.diary", icon: "book" },
  { key: "expense", label: "nav.expense", icon: "wallet" },
  { key: "google", label: "nav.google", icon: "external" },
];

const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const monthUrl = (ym: string) => `/api/month?ym=${ym}&tz=${encodeURIComponent(browserTz())}`;

/** "Today" depends on the browser's timezone, so the app only renders on the client (it sits behind login anyway). */
export default function App() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Main /> : <div className="shell" />;
}

function Main() {
  const { t, fmt } = useI18n();
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>("calendar");
  const [sel, setSel] = useState(todayStr());
  const [gmode, setGmode] = useState<GMode>("DAY");
  const ym = sel.slice(0, 7);
  const { data: month, error } = useApi<MonthData>(monthUrl(ym));

  // Once this month is on screen, warm the neighbours so month navigation is instant.
  useEffect(() => {
    if (!month) return;
    prefetch(monthUrl(shiftMonth(ym, -1)));
    prefetch(monthUrl(shiftMonth(ym, 1)));
  }, [month, ym]);

  const shift = (n: number) => {
    if (tab === "google" && (gmode === "DAY" || gmode === "WEEK")) {
      setSel(addDays(sel, n * (gmode === "DAY" ? 1 : 7)));
      return;
    }
    const next = shiftMonth(ym, n);
    setSel(next === todayStr().slice(0, 7) ? todayStr() : `${next}-01`);
  };
  const stats = useMemo(() => (month?.ym === ym ? computeStats(Object.values(month.days), todayStr()) : null), [month, ym]);
  const wk = mondayOf(sel), we = addDays(wk, 6);
  const title = tab === "google" && gmode === "DAY" ? fmt.full(sel)
    : tab === "google" && gmode === "WEEK" ? `${fmt.monthDay(wk)} – ${fmt.monthDay(we)}`
    : fmt.monthYear(ym);

  const deleteData = async () => {
    if (!confirm(t("account.deleteConfirm"))) return;
    const r = await fetch("/api/account", { method: "DELETE" });
    if (r.ok) signOut();
  };

  const account = (
    <>
      <LanguageSelect />
      <button className="btn" onClick={() => signOut()}>{t("account.signOut")}</button>
      <span className="legal-links">
        <Link href="/privacy">{t("legal.privacy")}</Link>
        <button type="button" onClick={deleteData}>{t("account.delete")}</button>
      </span>
    </>
  );

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><Brand /><span>Achievee</span></div>
        <nav className="nav">
          {TABS.map((tb) => (
            <button key={tb.key} className={tab === tb.key ? "on" : ""} onClick={() => setTab(tb.key)}>
              <Icon name={tb.icon} /><span>{t(tb.label)}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          {session?.user?.email && <small className="muted who" title={session.user.email}>{session.user.email}</small>}
          {account}
        </div>
      </aside>

      <main className="page">
        <header className="pagehead">
          <h1>{title}</h1>
          <div className="row gap-2">
            <button className="btn" onClick={() => setSel(todayStr())}>{t("common.today")}</button>
            <button className="btn icon" onClick={() => shift(-1)} aria-label={t("common.prev")}><Icon name="left" /></button>
            <button className="btn icon" onClick={() => shift(1)} aria-label={t("common.next")}><Icon name="right" /></button>
          </div>
        </header>
        {error && <p className="error">{t("common.loadFail")}</p>}
        {tab === "calendar" && <CalendarView ym={ym} month={month} stats={stats} sel={sel} setSel={setSel} />}
        {tab === "stats" && <StatsView stats={stats} month={month} />}
        {tab === "diary" && <DiaryView ym={ym} sel={sel} setSel={setSel} />}
        {tab === "google" && <GoogleCalView sel={sel} setSel={setSel} mode={gmode} setMode={setGmode} tasks={month?.ym === ym ? month.days[sel]?.tasks ?? [] : []} />}
        {tab === "expense" && <ExpenseView ym={ym} sel={sel} setSel={setSel} />}
        <footer className="pagefoot">{account}</footer>
      </main>
    </div>
  );
}
