"use client";
import { useState } from "react";
import { INTAKE_KINDS, type IntakeKind, type IntakeRow, dayTotal, daysMet, liters } from "@/lib/intake";
import type { Key } from "@/lib/i18n";
import { addDays, mondayOf } from "@/lib/dates";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import Icon from "./Icon";

const send = (method: string, body: unknown) =>
  fetch("/api/intake", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const QUICK: Record<IntakeKind, number[]> = { water: [250, 500], protein: [10, 20, 30] };
const GOALS: Record<IntakeKind, number[]> = {
  water: [1000, 1500, 2000, 2500, 3000, 3500, 4000],
  protein: [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200],
};
const fmtAmount = (k: IntakeKind, n: number) => (k === "water" ? liters(n) : `${n}g`);

/** Today's water and protein: quick-add buttons toward a goal. Items are fixed (water, protein); the goals are the user's own. */
export default function IntakeLog({ sel, goals, onGoal }: { sel: string; goals: Record<IntakeKind, number>; onGoal: (k: IntakeKind, v: number) => void }) {
  const { t } = useI18n();
  const week = mondayOf(sel);
  const { data, reload } = useApi<IntakeRow[]>(`/api/intake?from=${week}&to=${addDays(week, 7)}`);
  const rows = data ?? [];
  const [custom, setCustom] = useState<Record<IntakeKind, string>>({ water: "", protein: "" });
  const [editing, setEditing] = useState<IntakeKind | null>(null);
  const [exact, setExact] = useState("");

  const add = async (k: IntakeKind, delta: number) => { await send("POST", { date: sel, kind: k, delta }); reload(); };
  const addCustom = async (e: React.FormEvent, k: IntakeKind) => {
    e.preventDefault();
    const n = Number(custom[k].replace(/[^\d]/g, ""));
    if (!n) return;
    await add(k, n);
    setCustom({ ...custom, [k]: "" });
  };
  const saveExact = async (e: React.FormEvent, k: IntakeKind) => {
    e.preventDefault();
    const n = Number(exact.replace(/[^\d]/g, ""));
    await send("PUT", { date: sel, kind: k, amount: k === "water" ? n : n });
    setEditing(null); reload();
  };

  return (
    <section className="intake">
      <div className="sechead flush"><h3>{t("in.title")}</h3></div>
      <div className="intake-grid">
        {INTAKE_KINDS.map((k) => {
          const total = dayTotal(rows, sel, k), goal = goals[k];
          const options = GOALS[k].includes(goal) ? GOALS[k] : [...GOALS[k], goal].sort((a, b) => a - b);
          return (
            <div className="panel intake-card" key={k}>
              <div className="row between">
                <b>{t(`in.${k}` as Key)}</b>
                <button type="button" className="btn icon ghost" onClick={() => { setEditing(k); setExact(String(total)); }} aria-label={t("common.edit")} title={t("common.edit")}><Icon name="edit" size={16} /></button>
              </div>
              {editing === k ? (
                <form className="intake-exact" onSubmit={(e) => saveExact(e, k)}>
                  <input inputMode="numeric" value={exact} onChange={(e) => setExact(e.target.value)} autoFocus aria-label={t(`in.${k}` as Key)} />
                  <span className="muted">{k === "water" ? "ml" : "g"}</span>
                  <button className="btn primary">{t("common.save")}</button>
                  <button type="button" className="btn" onClick={() => setEditing(null)}>{t("common.cancel")}</button>
                </form>
              ) : (
                <div className="intake-val"><strong>{fmtAmount(k, total)}</strong><span> / {fmtAmount(k, goal)}</span></div>
              )}
              <div className="intake-bar" role="progressbar" aria-valuenow={total} aria-valuemax={goal}><i className={total >= goal ? "met" : ""} style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} /></div>
              <div className="intake-quick">
                {QUICK[k].map((n) => <button type="button" className="btn" key={n} onClick={() => add(k, n)}>+{n}{k === "water" ? "ml" : "g"}</button>)}
              </div>
              <form className="intake-custom" onSubmit={(e) => addCustom(e, k)}>
                <input inputMode="numeric" placeholder={`${t("in.custom")} (${k === "water" ? "ml" : "g"})`} value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} aria-label={t("in.custom")} />
                <button className="btn" disabled={!custom[k].trim()}>{t("common.add")}</button>
              </form>
              <div className="period">
                <label htmlFor={`goal-${k}`}>{t("in.goal")}</label>
                <select id={`goal-${k}`} value={goal} onChange={(e) => onGoal(k, Number(e.target.value))}>
                  {options.map((n) => <option key={n} value={n}>{fmtAmount(k, n)}</option>)}
                </select>
              </div>
            </div>
          );
        })}
      </div>
      <small className="muted">{t("in.week", { water: daysMet(rows, "water", goals.water), protein: daysMet(rows, "protein", goals.protein) })}</small>
    </section>
  );
}
