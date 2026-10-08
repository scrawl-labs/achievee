"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import Summary from "./Summary";

type Row = { id: number; date: string; category: string; memo: string; amount: number };
const CATS = ["식비", "카페", "교통", "쇼핑", "문화", "기타"];
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function ExpenseView({ ym, sel, setSel }: { ym: string; sel: string; setSel: (d: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState(CATS[0]);
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(() => fetch(`/api/expenses?ym=${ym}`).then((r) => r.json()).then(setRows), [ym]);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(/,/g, ""));
    if (!Number.isInteger(n) || n <= 0) return;
    await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: sel, category, memo, amount: n }) });
    setMemo(""); setAmount(""); load();
  };
  const del = async (id: number) => { await fetch(`/api/expenses?id=${id}`, { method: "DELETE" }); load(); };

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCat = CATS.map((c) => ({ c, v: rows.filter((r) => r.category === c).reduce((s, r) => s + r.amount, 0) }))
    .filter((x) => x.v).sort((a, b) => b.v - a.v);

  return (
    <>
      <Summary items={[["이번 달", won(total)], ["건수", `${rows.length}`]]} />
      <div className="two wide-left">
        <section className="list">
          <form className="panel entry" onSubmit={add}>
            <input type="date" value={sel} onChange={(e) => e.target.value && setSel(e.target.value)} />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <input placeholder="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
            <input placeholder="금액" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className="btn primary">추가</button>
          </form>
          {rows.map((r) => (
            <div className="item static row between" key={r.id}>
              <span><b>{Number(r.date.slice(8))}일</b> {r.category}{r.memo && <em> {r.memo}</em>}</span>
              <span className="row gap-2"><b className="num">{won(r.amount)}</b>
                <button className="btn icon ghost" onClick={() => del(r.id)} aria-label="삭제"><Icon name="close" size={16} /></button></span>
            </div>
          ))}
        </section>
        <section className="panel">
          <h3>카테고리</h3>
          {byCat.map(({ c, v }) => (
            <div className="hbar" key={c}><span>{c}</span><div><i style={{ width: `${(v / total) * 100}%` }} /></div><em>{won(v)}</em></div>
          ))}
        </section>
      </div>
    </>
  );
}
