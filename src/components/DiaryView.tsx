"use client";
import { useCallback, useEffect, useState } from "react";

type Row = { date: string; mood: number | null; body: string };
const MOODS = ["매우 나쁨", "나쁨", "보통", "좋음", "매우 좋음"];

const Dots = ({ n }: { n: number }) => (
  <span className="dots" aria-label={MOODS[n - 1]}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</span>
);

export default function DiaryView({ ym, sel, setSel }: { ym: string; sel: string; setSel: (d: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(true);

  const load = useCallback(() => fetch(`/api/diary?ym=${ym}`).then((r) => r.json()).then((r: any[]) =>
    setRows(r.map((x) => ({ ...x, mood: Number.isFinite(Number(x.mood)) && Number(x.mood) > 0 ? Number(x.mood) : null })))), [ym]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const r = rows.find((x) => x.date === sel);
    setMood(r?.mood ?? null); setBody(r?.body ?? ""); setSaved(true);
  }, [sel, rows]);

  const save = async () => {
    await fetch("/api/diary", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: sel, mood: mood ? String(mood) : null, body }) });
    await load();
  };

  return (
    <div className="two wide-left">
      <section className="panel">
        <input type="date" value={sel} onChange={(e) => e.target.value && setSel(e.target.value)} />
        <div className="seg" role="radiogroup" aria-label="기분">
          {MOODS.map((label, i) => (
            <button key={label} role="radio" aria-checked={mood === i + 1} className={mood === i + 1 ? "on" : ""}
              onClick={() => { setMood(mood === i + 1 ? null : i + 1); setSaved(false); }}>{label}</button>
          ))}
        </div>
        <textarea rows={10} value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }} />
        <div className="row end"><button className="btn primary" disabled={saved} onClick={save}>저장</button></div>
      </section>
      <section className="list">
        {rows.map((r) => (
          <button key={r.date} className={`item${r.date === sel ? " on" : ""}`} onClick={() => setSel(r.date)}>
            <span className="row between"><b>{Number(r.date.slice(8))}일</b>{r.mood && <Dots n={r.mood} />}</span>
            <p>{r.body}</p>
          </button>
        ))}
      </section>
    </div>
  );
}
