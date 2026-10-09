"use client";
import { useEffect, useMemo, useState } from "react";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Row = { date: string; mood: string | null; body: string };
const MOODS: Key[] = ["diary.m1", "diary.m2", "diary.m3", "diary.m4", "diary.m5"];
const moodOf = (v: string | null) => (Number(v) > 0 ? Number(v) : null);

export default function DiaryView({ ym, sel, setSel }: { ym: string; sel: string; setSel: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const { data, reload } = useApi<Row[]>(`/api/diary?ym=${ym}`);
  const rows = useMemo(() => (data ?? []).map((x) => ({ ...x, mood: moodOf(x.mood) })), [data]);
  const [mood, setMood] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const r = rows.find((x) => x.date === sel);
    setMood(r?.mood ?? null); setBody(r?.body ?? ""); setSaved(true);
  }, [sel, rows]);

  const save = async () => {
    await fetch("/api/diary", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: sel, mood: mood ? String(mood) : null, body }) });
    await reload();
  };

  const Dots = ({ n }: { n: number }) => (
    <span className="dots" aria-label={t(MOODS[n - 1])}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</span>
  );

  return (
    <div className="two wide-left">
      <section className="panel">
        <input type="date" value={sel} onChange={(e) => e.target.value && setSel(e.target.value)} />
        <div className="seg" role="radiogroup" aria-label={t("diary.mood")}>
          {MOODS.map((k, i) => (
            <button key={k} role="radio" aria-checked={mood === i + 1} className={mood === i + 1 ? "on" : ""}
              onClick={() => { setMood(mood === i + 1 ? null : i + 1); setSaved(false); }}>{t(k)}</button>
          ))}
        </div>
        <textarea rows={10} value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }} />
        <div className="row end"><button className="btn primary" disabled={saved} onClick={save}>{t("common.save")}</button></div>
      </section>
      <section className="list">
        {rows.map((r) => (
          <button key={r.date} className={`item${r.date === sel ? " on" : ""}`} onClick={() => setSel(r.date)}>
            <span className="row between"><b>{fmt.monthDay(r.date)}</b>{r.mood && <Dots n={r.mood} />}</span>
            <p>{r.body}</p>
          </button>
        ))}
      </section>
    </div>
  );
}
