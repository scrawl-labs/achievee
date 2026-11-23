"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import Icon from "./Icon";
import DatePicker from "./DatePicker";
import WeeklyReview from "./WeeklyReview";
import EmotionPicker from "./EmotionPicker";
import EmotionDictionary from "./EmotionDictionary";
import EmotionStats from "./EmotionStats";
import BoriFab from "./BoriFab";
import { Button, Paper, SaveStatus, Tabs } from "@achievee/ui";
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
  const [hadEmotions, setHadEmotions] = useState(false);
  const [saved, setSaved] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set()); // days shown in full in the list
  const toggle = (d: string) => setOpen((o) => { const n = new Set(o); if (n.has(d)) n.delete(d); else n.add(d); return n; });

  // load the day's entry; after a save the list reloads, but what is being typed stays as it is
  const shownDay = useRef<string | null>(null);
  const dirty = useRef(false);
  useEffect(() => {
    if (shownDay.current === sel && dirty.current) return;
    if (shownDay.current === sel && !data) return;
    shownDay.current = sel;
    const r = rows.find((x) => x.date === sel);
    setMood(r?.mood ?? null); setBody(r?.body ?? ""); setEmotions(r?.emotions ?? []); setHadEmotions((r?.emotions?.length ?? 0) > 0); setSaved(true);
  }, [sel, rows, data]);

  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  type Entry = { date: string; mood: string | null; body: string; emotions: string[] };
  // what is on screen, for the day it belongs to (not the newly picked day while switching)
  const entry = (): Entry => ({ date: shownDay.current ?? sel, mood: emotions.length || hadEmotions ? null : mood ? String(mood) : null, body, emotions });
  const pending = useRef<Entry | null>(null);
  useEffect(() => { if (dirty.current) pending.current = entry(); }); // eslint-disable-line react-hooks/exhaustive-deps -- refreshed after every render
  const put = (e: Entry) => fetch("/api/diary", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) }).then((r) => r.ok, () => false);
  const edits = useRef(0); // counts keystrokes and word changes, so a save that finishes mid-typing does not mark the newer text as saved
  const save = async () => {
    const at = edits.current;
    setState("saving");
    if (!(await put(entry()))) { setState("failed"); return; }
    setState("idle");
    if (edits.current !== at) return; // more was typed meanwhile: the next autosave sends it
    dirty.current = false; pending.current = null; setSaved(true);
    await reload();
  };
  const edit = () => { edits.current += 1; dirty.current = true; setSaved(false); };
  // saves on its own a moment after typing stops (no Save button)
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    if (saved) return;
    const id = window.setTimeout(() => { void saveRef.current(); }, 900);
    return () => window.clearTimeout(id);
  }, [saved, body, emotions]);
  // leaving the day or the page with something unsaved: save that day's text right away
  useEffect(() => () => {
    const e = pending.current;
    if (!dirty.current || !e) return;
    dirty.current = false; pending.current = null;
    void put(e).then(() => reload());
  }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps -- runs when the day changes

  const Dots = ({ n }: { n: number }) => (
    <span className="dots" aria-label={t(MOODS[n - 1])}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? "on" : ""} />)}</span>
  );

  return (
    <div className="two wide-left">
      <section className="panel diary-editor">
        <DatePicker value={sel} onChange={setSel} marksUrl={(m) => `/api/diary?ym=${m}`} />
        <EmotionPicker value={emotions} onChange={(v) => { setEmotions(v); edit(); }} />
        <Paper aria-label={t("nav.diary")} placeholder={t("diary.placeholder")} value={body} onChange={(e) => { setBody(e.target.value); edit(); }} />
        <SaveStatus count={t("diary.chars", { n: [...body].length })} state={state === "failed" ? "failed" : state === "saving" || !saved ? "saving" : "saved"}
          labels={{ saved: t("wk.saved"), saving: t("diary.saving"), retry: t("diary.retry") }} onRetry={save} />
      </section>
      <BoriFab beforeOpen={saved ? undefined : save} onSaved={() => { setSel(todayStr()); void reload(); }} />
      <section className="list">
        {rows.map((r) => {
          const isOpen = open.has(r.date);
          return (
            <div key={r.date} className={`item entry${r.date === sel ? " on" : ""}${isOpen ? " open" : ""}`}>
              <button type="button" className="entry-head" aria-expanded={isOpen} onClick={() => toggle(r.date)}>
                <span className="row between"><b>{fmt.monthDay(r.date)}</b><span className="row gap-2">{r.mood && <Dots n={r.mood} />}<Icon name="right" size={16} /></span></span>
                {r.emotions && r.emotions.length > 0 && <span className="emo-tags">{r.emotions.map((id) => <i key={id}>{wordText(id, lang)}</i>)}</span>}
                <p>{r.body}</p>
              </button>
              {isOpen && <div className="row end"><button type="button" className="btn" onClick={() => { setSel(r.date); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("common.edit")}</button></div>}
            </div>
          );
        })}
      </section>
    </div>
  );
}

/** Diary tab: the daily diary, plus a Sunday weekly review (a nudge card appears on Sundays until it is written). */
export default function DiaryView(props: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"day" | "week" | "dict" | "stats">("day");
  const today = todayStr();
  const isSunday = dow(today) === 0;
  const thisWeek = useApi<{ saved?: boolean }>(isSunday ? `/api/review?week=${mondayOf(today)}` : null).data;
  const nudge = mode === "day" && isSunday && thisWeek && !thisWeek.saved;
  return (
    <>
      <div className="sechead">
        <Tabs value={mode} onChange={setMode} items={[{ value: "day", label: t("nav.diary") }, { value: "week", label: t("wk.tab") }, { value: "stats", label: t("emo.statsTab") }, { value: "dict", label: t("emo.dictTab") }]} />
      </div>
      {nudge && (
        <div className="nudge">
          <div><b>{t("wk.sundayTitle")}</b><small>{t("wk.sundaySub")}</small></div>
          <Button variant="primary" onClick={() => { props.setSel(today); setMode("week"); }}>{t("wk.write")}</Button>
        </div>
      )}
      {mode === "day" ? <DayDiary {...props} /> : mode === "week" ? <WeeklyReview sel={props.sel} setSel={props.setSel} /> : mode === "stats" ? <EmotionStats /> : <EmotionDictionary />}
    </>
  );
}
