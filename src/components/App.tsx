"use client";
import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import type { MonthData } from "@/lib/types";
import { computeStats } from "@/lib/stats";
import { addDays, mondayOf } from "@/lib/dates";
import { periodOf } from "@/lib/period";
import { browserTz, todayStr } from "@/lib/clientTime";
import type { Key } from "@/lib/i18n";
import CalendarView from "./CalendarView";
import StatsView from "./StatsView";
import DiaryView from "./DiaryView";
import ExpenseView from "./ExpenseView";
import IntegrationsView from "./IntegrationsView";
import WorkoutView from "./WorkoutView";
import { DEFAULT_GOALS, type IntakeKind } from "@/lib/intake";
import GoogleCalView, { type GMode } from "./GoogleCalView";
import Icon from "./Icon";
import Wordmark from "./Wordmark";
import Footer from "./Footer";
import { useI18n } from "./I18n";
import { prefetch, useApi } from "./useApi";

type Tab = "calendar" | "stats" | "diary" | "expense" | "workout" | "google" | "integrations";
const TABS: { key: Tab; label: Key; icon: "calendar" | "chart" | "book" | "wallet" | "activity" | "external" | "plug" }[] = [
  { key: "calendar", label: "nav.calendar", icon: "calendar" },
  { key: "stats", label: "nav.stats", icon: "chart" },
  { key: "diary", label: "nav.diary", icon: "book" },
  { key: "expense", label: "nav.expense", icon: "wallet" },
  { key: "workout", label: "nav.workout", icon: "activity" },
  { key: "google", label: "nav.google", icon: "external" },
  { key: "integrations", label: "nav.integrations", icon: "plug" },
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
  const settings = useApi<{ monthStartDay: number; workoutGoal: number; intakeGoals: Record<IntakeKind, number> }>("/api/settings");
  const startDay = settings.data?.monthStartDay ?? 1;
  const workoutGoal = settings.data?.workoutGoal ?? 3;
  const intakeGoals = settings.data?.intakeGoals ?? DEFAULT_GOALS;
  const changeIntakeGoal = async (k: IntakeKind, v: number) => {
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(k === "water" ? { waterGoal: v } : { proteinGoal: v }) });
    settings.reload();
  };
  const changeGoal = async (n: number) => {
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workoutGoal: n }) });
    settings.reload();
  };
  const changeStartDay = async (d: number) => {
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ monthStartDay: d }) });
    settings.reload();
  };

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
  const per = periodOf(sel, startDay);
  const title = tab === "integrations" ? t("nav.integrations")
    : tab === "expense" && startDay > 1 ? `${fmt.monthDay(per.from)} – ${fmt.monthDay(addDays(per.to, -1))}`
    : tab === "google" && gmode === "DAY" ? fmt.full(sel)
    : tab === "google" && gmode === "WEEK" ? `${fmt.monthDay(wk)} – ${fmt.monthDay(we)}`
    : fmt.monthYear(ym);

  const deleteData = async () => {
    if (!confirm(t("account.deleteConfirm"))) return;
    const r = await fetch("/api/account", { method: "DELETE" });
    if (r.ok) signOut();
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><Wordmark height={22} /></div>
        <nav className="nav">
          {TABS.map((tb) => (
            <button key={tb.key} className={tab === tb.key ? "on" : ""} onClick={() => setTab(tb.key)}>
              <Icon name={tb.icon} /><span>{t(tb.label)}</span>
            </button>
          ))}
        </nav>
        <div className="account">
          {session?.user?.email && <small className="muted who" title={session.user.email}>{session.user.email}</small>}
          <button className="btn" onClick={() => signOut()}>{t("account.signOut")}</button>
        </div>
      </aside>

      <main className="page">
        <header className="pagehead">
          <h1>{title}</h1>
          {tab !== "integrations" && <div className="row gap-2">
            <button className="btn" onClick={() => setSel(todayStr())}>{t("common.today")}</button>
            <button className="btn icon" onClick={() => shift(-1)} aria-label={t("common.prev")}><Icon name="left" /></button>
            <button className="btn icon" onClick={() => shift(1)} aria-label={t("common.next")}><Icon name="right" /></button>
          </div>}
        </header>
        <div className="pagebody">
        {error && <p className="error">{t("common.loadFail")}</p>}
        {tab === "calendar" && <CalendarView ym={ym} month={month} stats={stats} sel={sel} setSel={setSel} onDiary={() => setTab("diary")} />}
        {tab === "stats" && <StatsView stats={stats} month={month} />}
        {tab === "diary" && <DiaryView ym={ym} sel={sel} setSel={setSel} />}
        {tab === "google" && <GoogleCalView sel={sel} setSel={setSel} mode={gmode} setMode={setGmode} tasks={month?.ym === ym ? month.days[sel]?.tasks ?? [] : []} />}
        {tab === "integrations" && <IntegrationsView />}
        {tab === "workout" && <WorkoutView sel={sel} setSel={setSel} goal={workoutGoal} onGoal={changeGoal} intakeGoals={intakeGoals} onIntakeGoal={changeIntakeGoal} />}
        {tab === "expense" && <ExpenseView sel={sel} setSel={setSel} startDay={startDay} onStartDay={changeStartDay} />}
        </div>
        <Footer onSignOut={() => signOut()} onDelete={deleteData} />
      </main>
    </div>
  );
}
