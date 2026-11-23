"use client";
import { useState } from "react";
import { WORKOUT_KINDS, type WorkoutKind, type WorkoutRow, tally } from "@/lib/workout";
import type { Key } from "@/lib/i18n";
import { addDays, addMonths, mondayOf } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import Icon from "./Icon";
import { askConfirm } from "./Confirm";
import { Button, Field, IconButton, List, ListRow, Tabs } from "@achievee/ui";
import Summary from "./Summary";
import DatePicker from "./DatePicker";
import BodyLog from "./BodyLog";
import IntakeLog from "./IntakeLog";
import type { IntakeKind } from "@/lib/intake";

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const digits = (s: string) => Number(s.replace(/[^\d]/g, ""));
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const kindKey = (k: WorkoutKind) => `wo.k.${k}` as Key;

/** Exercise log: sessions, minutes, and a weekly goal. The week and month shown follow the selected date. */
export default function WorkoutView({ sel, setSel, goal, onGoal, intakeGoals, onIntakeGoal }: {
  sel: string; setSel: (d: string) => void; goal: number; onGoal: (n: number) => void;
  intakeGoals: Record<IntakeKind, number>; onIntakeGoal: (k: IntakeKind, v: number) => void;
}) {
  const { t, fmt } = useI18n();
  const month = `${sel.slice(0, 7)}-01`, nextMonth = addMonths(month, 1);
  const week = mondayOf(sel), weekEnd = addDays(week, 7);
  // one request covers the month and the week around it (a week can start in the previous month)
  const { data, reload } = useApi<WorkoutRow[]>(`/api/workouts?from=${addDays(month, -7)}&to=${addDays(nextMonth, 7)}`);
  const rows = data ?? [];
  const monthRows = rows.filter((r) => r.date >= month && r.date < nextMonth);
  const w = tally(rows, week, weekEnd), m = tally(rows, month, nextMonth);
  const today = todayStr();

  const [mode, setMode] = useState<"log" | "intake" | "body">("log");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<WorkoutKind>("run");
  const [minutes, setMinutes] = useState("");
  const [memo, setMemo] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null); // the row whose actions are showing (tap on touch screens)
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
  const del = async (r: WorkoutRow) => {
    if (!(await askConfirm({ title: t("confirm.delete"), detail: `${fmt.monthDay(r.date)} · ${t(`wo.k.${r.kind}` as Key)} · ${t("foc.min", { m: r.minutes })}` }))) return;
    await send(`/api/workouts?id=${r.id}`, "DELETE"); reload();
  };
  const kindSelect = (value: WorkoutKind, onChange: (k: WorkoutKind) => void) => (
    <select value={value} onChange={(e) => onChange(e.target.value as WorkoutKind)} aria-label={t("wo.kind")}>
      {WORKOUT_KINDS.map((k) => <option key={k} value={k}>{t(kindKey(k))}</option>)}
    </select>
  );

  return (
    <>
      <div className="sechead">
        <Tabs value={mode} onChange={setMode} items={(["log", "intake", "body"] as const).map((k) => ({ value: k, label: t(k === "log" ? "nav.workout" : k === "intake" ? "in.title" : "body.title") }))} />
      </div>

      {mode === "log" && (
        <>
      <Summary items={[
        [t("wo.weekGoal", { n: goal }), w.sessions >= goal ? `${t("wo.times", { n: w.sessions })} ✓` : t("wo.times", { n: w.sessions })], [t("wo.weekTime"), dur(w.minutes)],
        [t("wo.month"), t("wo.times", { n: m.sessions })], [t("wo.monthTime"), dur(m.minutes)],
      ]} />
      <div className="two wide-left">
        <div className="stack-l">
          <section>
            <div className={`sechead${open ? "" : " flush"}`}>
              <h3>{t("wo.new")}</h3>
              <IconButton variant="soft" className={`add${open ? " open" : ""}`} aria-expanded={open} label={open ? t("common.close") : t("wo.addAria")} icon={<Icon name="plus" />} onClick={() => setOpen(!open)} />
            </div>
            {open && (
              <form className="panel entry" onSubmit={add}>
                <DatePicker value={sel} onChange={setSel} />
                {kindSelect(kind, setKind)}
                <Field placeholder={t("wo.minutes")} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} autoFocus />
                <Field className="wide" placeholder={t("exp.memo")} value={memo} onChange={(e) => setMemo(e.target.value)} />
                <Button type="submit" variant="primary">{t("common.add")}</Button>
              </form>
            )}
          </section>

          <section>
            <div className="sechead"><h3>{t("exp.history")}</h3></div>
            {monthRows.length === 0 && <p className="muted">{t("wo.empty")}</p>}
            <List className="ex-card" hidden={monthRows.length === 0}>
              {monthRows.map((r) => editId === r.id ? (
                <form className="panel entry" key={r.id} onSubmit={save}>
                  <DatePicker value={draft.date} onChange={(d) => setDraft({ ...draft, date: d })} />
                  {kindSelect(draft.kind, (k) => setDraft({ ...draft, kind: k }))}
                  <Field placeholder={t("wo.minutes")} inputMode="numeric" value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} autoFocus />
                  <Field className="wide" placeholder={t("exp.memo")} value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} />
                  <div className="edit-actions">
                    <Button onClick={() => setEditId(null)}>{t("common.cancel")}</Button>
                    <Button type="submit" variant="primary">{t("common.save")}</Button>
                  </div>
                </form>
              ) : (
                <ListRow key={r.id} title={t(kindKey(r.kind))} meta={r.memo ? `${fmt.monthDay(r.date)} · ${r.memo}` : fmt.monthDay(r.date)} amount={dur(r.minutes)}
                  open={openRow === r.id} onClick={() => setOpenRow(openRow === r.id ? null : r.id)}
                  actions={<>
                    <IconButton label={t("common.edit")} icon={<Icon name="edit" size={16} />} type="button" onClick={() => { setEditId(r.id); setDraft({ date: r.date, kind: r.kind, minutes: String(r.minutes), memo: r.memo }); }} />
                    <IconButton label={t("common.delete")} icon={<Icon name="close" size={16} />} type="button" onClick={() => del(r)} />
                  </>} />
              ))}
            </List>
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
      )}
      {mode === "intake" && <IntakeLog sel={sel} goals={intakeGoals} onGoal={onIntakeGoal} />}
      {mode === "body" && <BodyLog sel={sel} setSel={setSel} />}
    </>
  );
}
