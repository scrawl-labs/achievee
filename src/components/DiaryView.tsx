"use client";
import { useEffect, useMemo, useState } from "react";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import WeeklyReview from "./WeeklyReview";
import EmotionPicker from "./EmotionPicker";
import EmotionDictionary from "./EmotionDictionary";
import { emoLang, wordText } from "@/lib/emotions";
import { dow, mondayOf } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";

type Row = { date: string; mood: string | null; body: string; emotions?: string[] };
const MOODS: Key[] = ["diary.m1", "diary.m2", "diary.m3", "diary.m4", "diary.m5"];
const moodOf = (v: string | null) => (Number(v) > 0 ? Number(v) : null);

type Props = { ym: string; sel: string; setSel: (d: string) => void };

function DayDiary({ ym, sel, setSel }: Props) {
  const { t, fmt, locale } = useI18n();
  const lang = emoLang(locale);
  const { data, reload } = useApi<Row[]>(`/api/diary?ym=${ym}`);
  const rows = useMemo(() => (data ?? []).map((x) => ({ ...x, mood: moodOf(x.mood) })), [data]);
  const [mood, setMood] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [emotions, setEmotions] = useState<string[]>([]);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const r = rows.find((x) => x.date === sel);
    setMood(r?.mood ?? null); setBody(r?.body ?? ""); setEmotions(r?.emotions ?? []); setSaved(true);
  }, [sel, rows]);

  const save = async () => {
    await fetch("/api/diary", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: sel, mood: mood ? String(mood) : null, body, emotions }) });
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
        <EmotionPicker value={emotions} onChange={(v) => { setEmotions(v); setSaved(false); }} />
        <textarea rows={10} value={body} onChange={(e) => { setBody(e.target.value); setSaved(false); }} />
        <div className="row end"><button className="btn primary" disabled={saved} onClick={save}>{t("common.save")}</button></div>
      </section>
      <section className="list">
        {rows.map((r) => (
          <button key={r.date} className={`item${r.date === sel ? " on" : ""}`} onClick={() => setSel(r.date)}>
            <span className="row between"><b>{fmt.monthDay(r.date)}</b>{r.mood && <Dots n={r.mood} />}</span>
            {r.emotions && r.emotions.length > 0 && <span className="emo-tags">{r.emotions.map((id) => <i key={id}>{wordText(id, lang)}</i>)}</span>}
            <p>{r.body}</p>
          </button>
        ))}
      </section>
    </div>
  );
}

/** Diary tab: the daily diary, plus a Sunday weekly review (a nudge card appears on Sundays until it is written). */
export default function DiaryView(props: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"day" | "week" | "dict">("day");
  const today = todayStr();
  const isSunday = dow(today) === 0;
  const thisWeek = useApi<{ saved?: boolean }>(isSunday ? `/api/review?week=${mondayOf(today)}` : null).data;
  const nudge = mode === "day" && isSunday && thisWeek && !thisWeek.saved;
  return (
    <>
      <div className="sechead">
        <div className="tabs-t" role="tablist">
          <button role="tab" aria-selected={mode === "day"} className={mode === "day" ? "on" : ""} onClick={() => setMode("day")}>{t("nav.diary")}</button>
          <button role="tab" aria-selected={mode === "week"} className={mode === "week" ? "on" : ""} onClick={() => setMode("week")}>{t("wk.tab")}</button>
          <button role="tab" aria-selected={mode === "dict"} className={mode === "dict" ? "on" : ""} onClick={() => setMode("dict")}>{t("emo.dictTab")}</button>
        </div>
      </div>
      {nudge && (
        <div className="nudge">
          <div><b>{t("wk.sundayTitle")}</b><small>{t("wk.sundaySub")}</small></div>
          <button className="btn primary" onClick={() => { props.setSel(today); setMode("week"); }}>{t("wk.write")}</button>
        </div>
      )}
      {mode === "day" ? <DayDiary {...props} /> : mode === "week" ? <WeeklyReview sel={props.sel} setSel={props.setSel} /> : <EmotionDictionary />}
    </>
  );
}
