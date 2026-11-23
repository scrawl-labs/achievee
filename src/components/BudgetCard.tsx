"use client";
import { Button, Field, Select, Surface } from "@achievee/ui";
import { useState } from "react";
import { NO_BUDGET, budgetLine, crossed, weekFromMonth, weekOf, type Budget, type BudgetLine, type BudgetLevel } from "@/lib/budget";
import { addDays } from "@/lib/dates";
import { useI18n } from "./I18n";
import { invalidate, useApi } from "./useApi";

type Spend = { date: string; category: string; amount: number };
const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

/**
 * The spending goals for the shown day: this week (Monday to Sunday) and this pay month, fixed costs left out.
 * `check` says, for an expense about to be added, whether it pushes a goal to near (80%) or over, so the screen can say so once.
 */
export function useBudget(sel: string, period: { from: string; to: string }, periodRows: readonly Spend[]) {
  const settings = useApi<{ budget?: Budget }>("/api/settings");
  const budget = settings.data?.budget ?? NO_BUDGET;
  const wk = weekOf(sel);
  const weekRows = useApi<Spend[]>(budget.week > 0 ? `/api/expenses?from=${wk.from}&to=${wk.to}` : null).data ?? [];
  const week = budgetLine(weekRows, budget.week, wk.from, wk.to, budget.from, true);
  const month = budgetLine(periodRows, budget.month, period.from, period.to, budget.from, false);
  const check = (e: Spend): { scope: "week" | "month"; level: BudgetLevel; line: BudgetLine } | null => {
    if (e.category === "fixed") return null;
    const hit = (scope: "week" | "month", line: BudgetLine | null, end: string) => {
      if (!line || e.date < line.since || e.date >= end) return null;
      const level = crossed(line.spent, e.amount, line.limit);
      return level ? { scope, level, line: { ...line, spent: line.spent + e.amount, left: line.left - e.amount } } : null;
    };
    // the week speaks first: it is the one to steer by
    return hit("week", week, wk.to) ?? hit("month", month, period.to);
  };
  return { budget, week, month, weekRange: wk, periodRange: period, ready: !!settings.data, check, reload: () => { invalidate("/api/settings"); invalidate("/api/expenses"); } };
}

/** Saves the goals: both amounts (0 = none) and the first day they count. */
const save = (b: Budget) => fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget: b }) }).then((r) => r.ok, () => false);

export default function BudgetCard({ b, today, nextPeriod }: { b: ReturnType<typeof useBudget>; today: string; nextPeriod: string }) {
  const { t, fmt } = useI18n();
  const [editing, setEditing] = useState(false);
  if (!b.ready) return null;
  const has = b.budget.month > 0 || b.budget.week > 0;
  if (editing || !has) {
    return editing ? <BudgetEditor budget={b.budget} nextPeriod={nextPeriod} onDone={() => { setEditing(false); b.reload(); }} /> : (
      <Surface className="budget budget-empty">
        <p>{t("bud.empty")}</p>
        <Button size="sm" onClick={() => setEditing(true)}>{t("bud.set")}</Button>
      </Surface>
    );
  }
  const notYet = b.budget.from && b.budget.from > today;
  const line = (label: string, range: string, l: BudgetLine | null, prorated: boolean) => l && (
    <div className={`bline ${l.level}`}>
      <div className="bline-top">
        <span><b>{label}</b><small>{range}</small></span>
        <span className="num"><b>{fmt.money(l.spent)}</b><small> / {fmt.money(l.limit)}</small></span>
      </div>
      <div className="bbar" role="meter" aria-valuemin={0} aria-valuemax={l.limit} aria-valuenow={l.spent} aria-label={label}><i style={{ width: `${Math.min(l.ratio, 1) * 100}%` }} /></div>
      <small className="bline-msg">
        {l.level === "over" ? t("bud.over", { m: fmt.money(-l.left) }) : l.level === "near" ? t("bud.near", { p: Math.round(l.ratio * 100), m: fmt.money(l.left) }) : t("bud.left", { m: fmt.money(l.left) })}
        {l.partial && prorated && ` · ${t("bud.partial", { d: fmt.monthDay(l.since), n: Math.round((Date.parse(b.weekRange.to) - Date.parse(l.since)) / 864e5) })}`}
      </small>
    </div>
  );
  return (
    <Surface className="budget">
      <div className="budget-head">
        <h4>{t("bud.title")}</h4><small>{t("bud.noFixed")}</small>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>{t("common.edit")}</Button>
      </div>
      {line(t("bud.week"), `${fmt.monthDay(b.weekRange.from)} – ${fmt.monthDay(addDays(b.weekRange.to, -1))}`, b.week, true)}
      {line(t("bud.month"), `${fmt.monthDay(b.periodRange.from)} – ${fmt.monthDay(addDays(b.periodRange.to, -1))}`, b.month, false)}
      {/* goals set ahead of time (from the next pay day): say when they begin */}
      {notYet && (!b.week || !b.month) && <p className="muted budget-soon">{t("bud.starts", { d: fmt.monthDay(b.budget.from) })}</p>}
    </Surface>
  );
}

function BudgetEditor({ budget, nextPeriod, onDone }: { budget: Budget; nextPeriod: string; onDone: () => void }) {
  const { t, fmt } = useI18n();
  const [month, setMonth] = useState(budget.month ? String(budget.month) : "");
  const [week, setWeek] = useState(budget.week && budget.week !== weekFromMonth(budget.month) ? String(budget.week) : "");
  const [from, setFrom] = useState(budget.from || (budget.month || budget.week ? "" : nextPeriod));
  const [busy, setBusy] = useState(false);
  const m = digits(month), w = digits(week) || weekFromMonth(m);
  const submit = async (b: Budget) => { setBusy(true); const ok = await save(b); setBusy(false); if (ok) onDone(); };
  const froms = [["", t("bud.fromNow")], [nextPeriod, t("bud.fromNext", { d: fmt.monthDay(nextPeriod) })], ...(budget.from && budget.from !== nextPeriod ? [[budget.from, fmt.monthDay(budget.from)]] : [])];
  return (
    <Surface className="budget">
      <form className="budget-form" onSubmit={(e) => { e.preventDefault(); if (m > 0 || w > 0) void submit({ month: m, week: w, from }); }}>
        <div className="budget-head"><h4>{t("bud.title")}</h4><small>{t("bud.noFixed")}</small></div>
        <label><span>{t("bud.monthAmt")}</span><Field inputMode="numeric" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="810,000" autoFocus /></label>
        <label><span>{t("bud.weekAmt")}</span><Field inputMode="numeric" value={week} onChange={(e) => setWeek(e.target.value)} placeholder={m ? fmt.money(weekFromMonth(m)) : "189,000"} />
          {!week && m > 0 && <small className="muted">{t("bud.weekHint", { m: fmt.money(weekFromMonth(m)) })}</small>}</label>
        <label><span>{t("bud.from")}</span><Select value={from} onChange={(e) => setFrom(e.target.value)}>{froms.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></label>
        <div className="budget-actions">
          {(budget.month > 0 || budget.week > 0) && <Button variant="quiet" size="sm" disabled={busy} onClick={() => void submit(NO_BUDGET)}>{t("bud.off")}</Button>}
          <span className="grow" />
          <Button onClick={onDone}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" disabled={busy || (m <= 0 && w <= 0)}>{t("common.save")}</Button>
        </div>
      </form>
    </Surface>
  );
}
