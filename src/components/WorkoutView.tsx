"use client";
import { useState } from "react";
import { WORKOUT_KINDS, type WorkoutKind, type WorkoutRow, tally } from "@/lib/workout";
import type { Key } from "@/lib/i18n";
import { addDays, addMonths, mondayOf } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import Icon from "./Icon";
import Summary from "./Summary";
import DatePicker from "./DatePicker";

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const digits = (s: string) => Number(s.replace(/[^\d]/g, ""));
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const kindKey = (k: WorkoutKind) => `wo.k.${k}` as Key;

/** Exercise log: sessions, minutes, and a weekly goal. The week and month shown follow the selected date. */
export default function WorkoutView({ sel, setSel, goal, onGoal }: { sel: string; setSel: (d: string) => void; goal: number; onGoal: (n: number) => void }) {
  const { t, fmt } = useI18n();
  const month = `${sel.slice(0, 7)}-01`, nextMonth = addMonths(month, 1);
  const week = mondayOf(sel), weekEnd = addDays(week, 7);
  // one request covers the month and the week around it (a week can start in the previous month)
  const { data, reload } = useApi<WorkoutRow[]>(`/api/workouts?from=${addDays(month, -7)}&to=${addDays(nextMonth, 7)}`);
  const rows = data ?? [];
  const monthRows = rows.filter((r) => r.date >= month && r.date < nextMonth);
  const w = tally(rows, week, weekEnd), m = tally(rows, month, nextMonth);
  const today = todayStr();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<WorkoutKind>("run");
  const [minutes, setMinutes] = useState("");
  const [memo, setMemo] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ date: "", kind: "run" as WorkoutKind, minutes: "", memo: "" });

  const dur = (min: number) => (min >= 60 ? t("foc.dur", { h: Math.floor(min / 60), m: min % 60 }) : t("foc.min", { m: min }));
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = digits(minutes);
    if (!Number.isInteger(n) || n <= 0) return;
    await send("/api/workouts", "POST", { date: sel, kind, minutes: n, memo });
    setMinutes(""); setMemo(""); setOpen(false); reload();
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = digits(draft.minutes);
    if (editId === null || !draft.date || !Number.isInteger(n) || n <= 0) return;
    await send("/api/workouts", "PATCH", { id: editId, date: draft.date, kind: draft.kind, minutes: n, memo: draft.memo });
    setEditId(null); reload();
  };
  const del = async (id: number) => { await send(`/api/workouts?id=${id}`, "DELETE"); reload(); };
  const kindSelect = (value: WorkoutKind, onChange: (k: WorkoutKind) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value as WorkoutKind)} aria-label={t("wo.kind")}>
      {WORKOUT_KINDS.map((k) => <option key={k} value={k}>{t(kindKey(k))}</option>)}
    </select>
  );

  return (
    <>
      <Summary items={[
        [t("wo.thisWeek"), `${w.sessions} / ${goal}`], [t("wo.weekTime"), dur(w.minutes)],
        [t("wo.month"), t("wo.times", { n: m.sessions })], [t("wo.monthTime"), dur(m.minutes)],
      ]} />
      <div className="two wide-left">
        <div className="stack-l">
          <section>
            <div className={`sechead${open ? "" : " flush"}`}>
              <h3>{t("wo.new")}</h3>
              <button type="button" className={`btn icon add${open ? " open" : ""}`} aria-expanded={open} aria-label={open ? t("common.close") : t("wo.addAria")} onClick={() => setOpen(!open)}><Icon name="plus" /></button>
            </div>
            {open && (
              <form className="panel entry" onSubmit={add}>
                <DatePicker value={sel} onChange={setSel} />
                {kindSelect(kind, setKind)}
                <input placeholder={t("wo.minutes")} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} autoFocus />
                <input className="wide" placeholder={t("exp.memo")} value={memo} onChange={(e) => setMemo(e.target.value)} />
                <button className="btn primary">{t("common.add")}</button>
              </form>
            )}
          </section>

          <section>
            <div className="sechead"><h3>{t("exp.history")}</h3></div>
            <div className="list">
              {monthRows.length === 0 && <p className="muted">{t("wo.empty")}</p>}
              {monthRows.map((r) => editId === r.id ? (
                <form className="panel entry" key={r.id} onSubmit={save}>
                  <DatePicker value={draft.date} onChange={(d) => setDraft({ ...draft, date: d })} />
                  {kindSelect(draft.kind, (k) => setDraft({ ...draft, kind: k }))}
                  <input placeholder={t("wo.minutes")} inputMode="numeric" value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} autoFocus />
                  <input className="wide" placeholder={t("exp.memo")} value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} />
                  <div className="edit-actions">
                    <button type="button" className="btn" onClick={() => setEditId(null)}>{t("common.cancel")}</button>
                    <button className="btn primary">{t("common.save")}</button>
                  </div>
                </form>
              ) : (
                <div className="item static erow noChip" key={r.id}>
                  <div className="emain">
                    <span className="etop"><b>{fmt.monthDay(r.date)}</b><span className="ecat">{t(kindKey(r.kind))}</span></span>
                    {r.memo && <span className="ememo">{r.memo}</span>}
                  </div>
                  <div className="eside">
                    <b className="num">{dur(r.minutes)}</b>
                    <span className="acts">
                      <button className="btn icon ghost" onClick={() => { setEditId(r.id); setDraft({ date: r.date, kind: r.kind, minutes: String(r.minutes), memo: r.memo }); }} aria-label={t("common.edit")} title={t("common.edit")}><Icon name="edit" size={16} /></button>
                      <button className="btn icon ghost" onClick={() => del(r.id)} aria-label={t("common.delete")}><Icon name="close" size={16} /></button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel">
          <h3>{t("wo.weekView")}</h3>
          <div className="wo-week">
            {MON_FIRST.map((d, i) => {
              const date = addDays(week, i);
              return (
                <div key={d} className={`${w.days.has(date) ? "on" : ""}${date === today ? " today" : ""}`}>
                  <i aria-label={w.days.has(date) ? t("wo.done") : undefined}>{w.days.has(date) && <Icon name="check" size={16} />}</i>
                  <span>{fmt.weekdayShort(d)}</span>
                </div>
              );
            })}
          </div>
          <div className="period">
            <label htmlFor="wogoal">{t("wo.goal")}</label>
            <select id="wogoal" value={goal} onChange={(e) => onGoal(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{t("wo.perWeek", { n })}</option>)}
            </select>
            <small>{w.sessions >= goal ? t("wo.goalMet") : t("wo.goalLeft", { n: goal - w.sessions })}</small>
          </div>
        </section>
      </div>
    </>
  );
}
