"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import Summary from "./Summary";

type Row = { id: number; date: string; category: string; memo: string; amount: number; need: number };
type Filter = "all" | "need" | "waste";
const BARS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const FILTERS: [Filter, string][] = [["all", "전체"], ["need", "필요"], ["waste", "불필요"]];
const CATS = ["식비", "카페", "교통", "쇼핑", "문화", "기타"];
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function ExpenseView({ ym, sel, setSel }: { ym: string; sel: string; setSel: (d: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState(CATS[0]);
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");
  const [need, setNeed] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => fetch(`/api/expenses?ym=${ym}`).then((r) => r.json()).then(setRows), [ym]);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(/,/g, ""));
    if (!Number.isInteger(n) || n <= 0) return;
    await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: sel, category, memo, amount: n, need }) });
    setMemo(""); setAmount(""); load();
  };
  const toggle = async (r: Row) => {
    await fetch("/api/expenses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id, need: !r.need }) });
    load();
  };
  const del = async (id: number) => { await fetch(`/api/expenses?id=${id}`, { method: "DELETE" }); load(); };

  const sum = (rs: Row[]) => rs.reduce((s, r) => s + r.amount, 0);
  const total = sum(rows), needSum = sum(rows.filter((r) => r.need)), wasteSum = total - needSum;
  const shown = rows.filter((r) => filter === "all" || (filter === "need" ? r.need : !r.need));
  const shownTotal = sum(shown);
  const byCat = CATS.map((c) => ({ c, v: sum(shown.filter((r) => r.category === c)) })).filter((x) => x.v).sort((a, b) => b.v - a.v);

  return (
    <>
      <Summary items={[["이번 달", won(total)], ["필요", won(needSum)], ["불필요", won(wasteSum)], ["불필요 비율", total ? `${Math.round((wasteSum / total) * 100)}%` : "-"]]} />
      <div className="two wide-left">
        <div className="stack-l">
          <section>
            <div className="sechead"><h3>새 지출</h3></div>
            <form className="panel entry" onSubmit={add}>
            <input type="date" value={sel} onChange={(e) => e.target.value && setSel(e.target.value)} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <input placeholder="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
            <input placeholder="금액" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="seg two" role="radiogroup" aria-label="필요 여부">
              <button type="button" role="radio" aria-checked={need} className={need ? "on need" : ""} onClick={() => setNeed(true)}>필요한 지출</button>
              <button type="button" role="radio" aria-checked={!need} className={!need ? "on waste" : ""} onClick={() => setNeed(false)}>불필요한 지출</button>
            </div>
            <button className="btn primary">추가</button>
          </form>
          </section>
          <section>
            <div className="sechead">
              <h3>내역</h3>
              <div className="tabs-t" role="tablist" aria-label="필터">
                {FILTERS.map(([k, label]) => (
                  <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                    {label}<em>{k === "all" ? rows.length : rows.filter((r) => (k === "need" ? r.need : !r.need)).length}</em>
                  </button>
                ))}
              </div>
            </div>
            <div className="list">
          {shown.map((r) => (
            <div className="item static row between" key={r.id}>
              <span><b>{Number(r.date.slice(8))}일</b> {r.category}{r.memo && <em> {r.memo}</em>}</span>
              <span className="row gap-2">
                <button className={`chip ${r.need ? "need" : "waste"}`} onClick={() => toggle(r)} title="눌러서 바꾸기">{r.need ? "필요" : "불필요"}</button>
                <b className="num">{won(r.amount)}</b>
                <button className="btn icon ghost" onClick={() => del(r.id)} aria-label="삭제"><Icon name="close" size={16} /></button></span>
            </div>
          ))}
            </div>
          </section>
        </div>
        <section className="panel">
          <h3>{filter === "all" ? "카테고리" : filter === "need" ? "필요한 지출" : "불필요한 지출"} {won(shownTotal)}</h3>
          {filter === "all" && total > 0 && <div className="split" aria-hidden="true"><i style={{ width: `${(needSum / total) * 100}%` }} /><i style={{ width: `${(wasteSum / total) * 100}%` }} /></div>}
          {byCat.map(({ c, v }) => (
            <div className="hbar" key={c}><span>{c}</span><div><i style={{ width: `${(v / shownTotal) * 100}%`, ["--bar" as string]: BARS[CATS.indexOf(c)] }} /></div><em>{won(v)}</em></div>
          ))}
        </section>
      </div>
    </>
  );
}
