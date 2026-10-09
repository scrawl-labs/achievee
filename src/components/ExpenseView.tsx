"use client";
import { useState } from "react";
import { CATEGORIES, type Category, type Key, categoryOf } from "@/lib/i18n";
import Icon from "./Icon";
import Summary from "./Summary";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Row = { id: number; date: string; category: string; memo: string; amount: number; need: number };
type Filter = "all" | "need" | "waste";
const BARS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const FILTERS: [Filter, Key][] = [["all", "exp.all"], ["need", "exp.need"], ["waste", "exp.waste"]];

export default function ExpenseView({ ym, sel, setSel }: { ym: string; sel: string; setSel: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const { data, reload } = useApi<Row[]>(`/api/expenses?ym=${ym}`);
  const rows = data ?? [];
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [need, setNeed] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const catName = (c: string) => t(`cat.${categoryOf(c)}` as Key);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(/[^\d]/g, ""));
    if (!Number.isInteger(n) || n <= 0) return;
    await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: sel, category, memo, amount: n, need }) });
    setMemo(""); setAmount(""); setOpen(false); reload();
  };
  const toggle = async (r: Row) => {
    await fetch("/api/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, need: !r.need }) });
    reload();
  };
  const del = async (id: number) => { await fetch(`/api/expenses?id=${id}`, { method: "DELETE" }); reload(); };

  const sum = (rs: Row[]) => rs.reduce((s, r) => s + r.amount, 0);
  const total = sum(rows), needSum = sum(rows.filter((r) => r.need)), wasteSum = total - needSum;
  const shown = rows.filter((r) => filter === "all" || (filter === "need" ? r.need : !r.need));
  const shownTotal = sum(shown);
  const byCat = CATEGORIES.map((c) => ({ c, v: sum(shown.filter((r) => categoryOf(r.category) === c)) })).filter((x) => x.v).sort((a, b) => b.v - a.v);

  return (
    <>
      <Summary items={[[t("exp.thisMonth"), fmt.money(total)], [t("exp.need"), fmt.money(needSum)], [t("exp.waste"), fmt.money(wasteSum)], [t("exp.wasteRatio"), total ? `${Math.round((wasteSum / total) * 100)}%` : "-"]]} />
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
              {shown.map((r) => (
                <div className="item static row between" key={r.id}>
                  <span><b>{fmt.monthDay(r.date)}</b> {catName(r.category)}{r.memo && <em> {r.memo}</em>}</span>
                  <span className="row gap-2">
                    <button className={`chip ${r.need ? "need" : "waste"}`} onClick={() => toggle(r)} title={t("exp.toggle")}>{r.need ? t("exp.need") : t("exp.waste")}</button>
                    <b className="num">{fmt.money(r.amount)}</b>
                    <button className="btn icon ghost" onClick={() => del(r.id)} aria-label={t("common.delete")}><Icon name="close" size={16} /></button></span>
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
        </section>
      </div>
    </>
  );
}
