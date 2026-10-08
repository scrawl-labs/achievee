"use client";
import { useCallback, useEffect, useState } from "react";
import { todayStr } from "./App";

type Row = { date: string; mood: string | null; body: string };
const MOODS = ["😄", "🙂", "😐", "😔", "😡"];

export default function DiaryView({ ym }: { ym: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [date, setDate] = useState(todayStr());
  const [mood, setMood] = useState<string | null>(null);
  const [body, setBody] = useState("");

  const load = useCallback(() => fetch(`/api/diary?ym=${ym}`).then((r) => r.json()).then(setRows), [ym]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const r = rows.find((x) => x.date === date);
    setMood(r?.mood ?? null); setBody(r?.body ?? "");
  }, [date, rows]);

  const save = async () => {
    await fetch("/api/diary", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, mood, body }) });
    load();
  };

  return (
    <div className="stack">
      <div className="card">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="moods">
          {MOODS.map((m) => <button key={m} className={mood === m ? "on" : ""} onClick={() => setMood(mood === m ? null : m)}>{m}</button>)}
        </div>
        <textarea rows={6} placeholder="오늘은 어땠나요?" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="pill primary" onClick={save}>저장</button>
      </div>
      {rows.map((r) => (
        <button key={r.date} className="card entry" onClick={() => setDate(r.date)}>
          <b>{r.date} {r.mood}</b><p>{r.body}</p>
        </button>
      ))}
    </div>
  );
}
