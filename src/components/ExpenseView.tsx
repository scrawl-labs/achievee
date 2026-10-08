"use client";
import { useCallback, useEffect, useState } from "react";
import { todayStr } from "./App";

type Row = { id: number; date: string; category: string; memo: string; amount: number };
const CATS = ["식비", "교통", "쇼핑", "카페", "문화", "기타"];
const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function ExpenseView({ ym }: { ym: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState(CATS[0]);
  const [memo, setMemo] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(() => fetch(`/api/expenses?ym=${ym}`).then((r) => r.json()).then(setRows), [ym]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = Number(amount.replace(/,/g, ""));
    if (!Number.isInteger(n) || n <= 0) return;
    await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, category, memo, amount: n }) });
    setMemo(""); setAmount(""); load();
  };
  const del = async (id: number) => { await fetch(`/api/expenses?id=${id}`, { method: "DELETE" }); load(); };

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const byCat = CATS.map((c) => ({ c, v: rows.filter((r) => r.category === c).reduce((s, r) => s + r.amount, 0) })).filter((x) => x.v);

  return (
    <div className="stack">
      <div className="summary"><div><b>{won(total)}</b><span>이번 달 지출</span></div></div>
      {byCat.length > 0 && (
        <div className="card">
          {byCat.map(({ c, v }) => (
            <div className="bar" key={c}><span>{c}</span><div><i style={{ width: `${(v / total) * 100}%` }} /></div><em>{won(v)}</em></div>
          ))}
        </div>
      )}
      <div className="card form">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <input placeholder="메모" value={memo} onChange={(e) => setMemo(e.target.value)} />
        <input placeholder="금액" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="pill primary" onClick={add}>추가</button>
      </div>
      {rows.map((r) => (
        <div className="card row" key={r.id}>
          <span>{r.date.slice(5)} · {r.category}{r.memo && ` · ${r.memo}`}</span>
          <b>{won(r.amount)}</b>
          <button className="pill round" onClick={() => del(r.id)} aria-label="삭제">×</button>
        </div>
      ))}
    </div>
  );
}
