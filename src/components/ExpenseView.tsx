"use client";
import { useState } from "react";
import { CATEGORIES, type Category, type Key, categoryOf } from "@/lib/i18n";
import { periodOf } from "@/lib/period";
import Icon from "./Icon";
import Summary from "./Summary";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Row = { id: number; date: string; category: string; memo: string; amount: number; need: number };
type Inc = { id: number; date: string; memo: string; amount: number };
type Filter = "all" | "need" | "waste";
const BARS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const FILTERS: [Filter, Key][] = [["all", "exp.all"], ["need", "exp.need"], ["waste", "exp.waste"]];
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const digits = (s: string) => Number(s.replace(/[^\d]/g, ""));

/** Spending + income for one "month" that starts on `startDay` (e.g. the 25th when the salary arrives on the 25th). */
export default function ExpenseView({ sel, setSel, startDay, onStartDay }: {
  sel: string; setSel: (d: string) => void; startDay: number; onStartDay: (d: number) => void;
}) {
  const { t, fmt } = useI18n();
  const { from, to } = periodOf(sel, startDay);
  const { data, reload } = useApi<Row[]>(`/api/expenses?from=${from}&to=${to}`);
  const { data: incData, reload: reloadInc } = useApi<Inc[]>(`/api/income?from=${from}&to=${to}`);
  const rows = data ?? [], incRows = incData ?? [];

  // --- expenses
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [need, setNeed] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ date: "", category: CATEGORIES[0] as Category, need: true, amount: "", memo: "" });
  const catName = (c: string) => t(`cat.${categoryOf(c)}` as Key);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = digits(amount);
    if (!Number.isInteger(n) || n <= 0) return;
    await send("/api/expenses", "POST", { date: sel, category, memo, amount: n, need });
    setMemo(""); setAmount(""); setOpen(false); reload();
  };
  const toggle = async (r: Row) => { await send("/api/expenses", "PATCH", { id: r.id, need: !r.need }); reload(); };
  const del = async (id: number) => { await send(`/api/expenses?id=${id}`, "DELETE"); reload(); };
  const startEdit = (r: Row) => {
    setEditId(r.id);
    setDraft({ date: r.date, category: categoryOf(r.category), need: !!r.need, amount: String(r.amount), memo: r.memo });
  };
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = digits(draft.amount);
    if (editId === null || !draft.date || !Number.isInteger(n) || n <= 0) return;
    await send("/api/expenses", "PATCH", { id: editId, date: draft.date, category: draft.category, memo: draft.memo, amount: n, need: draft.need });
    setEditId(null); reload();
  };

  // --- income
  const [iOpen, setIOpen] = useState(false);
  const [iAmount, setIAmount] = useState("");
  const [iMemo, setIMemo] = useState("");
  const [iEditId, setIEditId] = useState<number | null>(null);
  const [iDraft, setIDraft] = useState({ date: "", amount: "", memo: "" });
  const addInc = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = digits(iAmount);
    if (!Number.isInteger(n) || n <= 0) return;
    await send("/api/income", "POST", { date: sel, memo: iMemo, amount: n });
    setIAmount(""); setIMemo(""); setIOpen(false); reloadInc();
  };
  const saveInc = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = digits(iDraft.amount);
    if (iEditId === null || !iDraft.date || !Number.isInteger(n) || n <= 0) return;
    await send("/api/income", "PATCH", { id: iEditId, date: iDraft.date, memo: iDraft.memo, amount: n });
    setIEditId(null); reloadInc();
  };
  const delInc = async (id: number) => { await send(`/api/income?id=${id}`, "DELETE"); reloadInc(); };

  // --- numbers
  const sum = (rs: { amount: number }[]) => rs.reduce((s, r) => s + r.amount, 0);
  const total = sum(rows), needSum = sum(rows.filter((r) => r.need)), wasteSum = total - needSum;
  const incomeTotal = sum(incRows);
  const shown = rows.filter((r) => filter === "all" || (filter === "need" ? r.need : !r.need));
  const shownTotal = sum(shown);
  const byCat = CATEGORIES.map((c) => ({ c, v: sum(shown.filter((r) => categoryOf(r.category) === c)) })).filter((x) => x.v).sort((a, b) => b.v - a.v);

  return (
    <>
      <Summary items={[
        [t("inc.income"), fmt.money(incomeTotal)], [t("cal.spent"), fmt.money(total)],
        [t("inc.balance"), fmt.money(incomeTotal - total)], [t("exp.wasteRatio"), total ? `${Math.round((wasteSum / total) * 100)}%` : "-"],
      ]} />
      <div className="two wide-left">
        <div className="stack-l">
          <section>
            <div className={`sechead${open ? "" : " flush"}`}>
              <h3>{t("exp.new")}</h3>
              <button type="button" className={`btn icon add${open ? " open" : ""}`} aria-expanded={open} aria-label={open ? t("common.close") : t("exp.addAria")} onClick={() => setOpen(!open)}><Icon name="plus" /></button>
            </div>
            {open && (
              <form className="panel entry" onSubmit={add}>
                <input type="date" value={sel} onChange={(e) => e.target.value && setSel(e.target.value)} />
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label={t("exp.category")}>{CATEGORIES.map((c) => <option key={c} value={c}>{catName(c)}</option>)}</select>
                <select value={need ? "need" : "waste"} onChange={(e) => setNeed(e.target.value === "need")} aria-label={t("exp.needOrNot")}>
                  <option value="need">{t("exp.needOpt")}</option>
                  <option value="waste">{t("exp.wasteOpt")}</option>
                </select>
                <input placeholder={t("exp.amount")} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                <input className="wide" placeholder={t("exp.memo")} value={memo} onChange={(e) => setMemo(e.target.value)} />
                <button className="btn primary">{t("common.add")}</button>
              </form>
            )}
          </section>

          <section>
            <div className="sechead">
              <h3>{t("exp.history")}</h3>
              <div className="tabs-t" role="tablist" aria-label={t("exp.filter")}>
                {FILTERS.map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                    {t(label)}<em>{k === "all" ? rows.length : rows.filter((r) => (k === "need" ? r.need : !r.need)).length}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="list">
              {shown.map((r) => editId === r.id ? (
                <form className="panel entry" key={r.id} onSubmit={saveEdit}>
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
                  <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })} aria-label={t("exp.category")}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{catName(c)}</option>)}
                  </select>
                  <select value={draft.need ? "need" : "waste"} onChange={(e) => setDraft({ ...draft, need: e.target.value === "need" })} aria-label={t("exp.needOrNot")}>
                    <option value="need">{t("exp.needOpt")}</option>
                    <option value="waste">{t("exp.wasteOpt")}</option>
                  </select>
                  <input placeholder={t("exp.amount")} inputMode="numeric" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} autoFocus />
                  <input className="wide" placeholder={t("exp.memo")} value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} />
                  <div className="edit-actions">
                    <button type="button" className="btn" onClick={() => setEditId(null)}>{t("common.cancel")}</button>
                    <button className="btn primary">{t("common.save")}</button>
                  </div>
                </form>
              ) : (
                <div className="item static erow" key={r.id}>
                  <button className={`chip ${r.need ? "need" : "waste"}`} onClick={() => toggle(r)} title={t("exp.toggle")}>{r.need ? t("exp.need") : t("exp.waste")}</button>
                  <div className="emain">
                    <span className="etop"><b>{fmt.monthDay(r.date)}</b><span className="ecat">{catName(r.category)}</span></span>
                    {r.memo && <span className="ememo">{r.memo}</span>}
                  </div>
                  <div className="eside">
                    <b className="num">{fmt.money(r.amount)}</b>
                    <span className="acts">
                      <button className="btn icon ghost" onClick={() => startEdit(r)} aria-label={t("common.edit")} title={t("common.edit")}><Icon name="edit" size={16} /></button>
                      <button className="btn icon ghost" onClick={() => del(r.id)} aria-label={t("common.delete")}><Icon name="close" size={16} /></button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className={`sechead${iOpen ? "" : " flush"}`}>
              <h3>{t("inc.income")}</h3>
              <button type="button" className={`btn icon add${iOpen ? " open" : ""}`} aria-expanded={iOpen} aria-label={iOpen ? t("common.close") : t("inc.addAria")} onClick={() => setIOpen(!iOpen)}><Icon name="plus" /></button>
            </div>
            {iOpen && (
              <form className="panel entry" onSubmit={addInc}>
                <input type="date" value={sel} onChange={(e) => e.target.value && setSel(e.target.value)} />
                <input placeholder={t("exp.amount")} inputMode="numeric" value={iAmount} onChange={(e) => setIAmount(e.target.value)} autoFocus />
                <input className="wide" placeholder={t("exp.memo")} value={iMemo} onChange={(e) => setIMemo(e.target.value)} />
                <button className="btn primary">{t("common.add")}</button>
              </form>
            )}
            <div className="list inc-list">
              {incRows.length === 0 && !iOpen && <p className="muted">{t("inc.empty")}</p>}
              {incRows.map((r) => iEditId === r.id ? (
                <form className="panel entry" key={r.id} onSubmit={saveInc}>
                  <input type="date" value={iDraft.date} onChange={(e) => setIDraft({ ...iDraft, date: e.target.value })} />
                  <input placeholder={t("exp.amount")} inputMode="numeric" value={iDraft.amount} onChange={(e) => setIDraft({ ...iDraft, amount: e.target.value })} autoFocus />
                  <input className="wide" placeholder={t("exp.memo")} value={iDraft.memo} onChange={(e) => setIDraft({ ...iDraft, memo: e.target.value })} />
                  <div className="edit-actions">
                    <button type="button" className="btn" onClick={() => setIEditId(null)}>{t("common.cancel")}</button>
                    <button className="btn primary">{t("common.save")}</button>
                  </div>
                </form>
              ) : (
                <div className="item static erow noChip" key={r.id}>
                  <div className="emain">
                    <span className="etop"><b>{fmt.monthDay(r.date)}</b></span>
                    {r.memo && <span className="ememo">{r.memo}</span>}
                  </div>
                  <div className="eside">
                    <b className="num inc">{fmt.money(r.amount)}</b>
                    <span className="acts">
                      <button className="btn icon ghost" onClick={() => { setIEditId(r.id); setIDraft({ date: r.date, amount: String(r.amount), memo: r.memo }); }} aria-label={t("common.edit")} title={t("common.edit")}><Icon name="edit" size={16} /></button>
                      <button className="btn icon ghost" onClick={() => delInc(r.id)} aria-label={t("common.delete")}><Icon name="close" size={16} /></button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel">
          <h3>{filter === "all" ? t("exp.category") : filter === "need" ? t("exp.needOpt") : t("exp.wasteOpt")} {fmt.money(shownTotal)}</h3>
          {filter === "all" && total > 0 && <div className="split" aria-hidden="true"><i style={{ width: `${(needSum / total) * 100}%` }} /><i style={{ width: `${(wasteSum / total) * 100}%` }} /></div>}
          {byCat.map(({ c, v }) => (
            <div className="hbar" key={c}><span>{catName(c)}</span><div><i style={{ width: `${(v / shownTotal) * 100}%`, ["--bar" as string]: BARS[CATEGORIES.indexOf(c)] }} /></div><em>{fmt.money(v)}</em></div>
          ))}
          <div className="period">
            <label htmlFor="startday">{t("inc.startDay")}</label>
            <select id="startday" value={startDay} onChange={(e) => onStartDay(Number(e.target.value))}>
              {DAYS.map((d) => <option key={d} value={d}>{t("inc.day", { n: d })}</option>)}
            </select>
            <small>{t("inc.startHint")}</small>
          </div>
        </section>
      </div>
    </>
  );
}
