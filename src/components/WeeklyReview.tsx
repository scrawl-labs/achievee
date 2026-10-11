"use client";
import { useEffect, useMemo, useState } from "react";
import type { MonthData } from "@/lib/types";
import { addDays, mondayOf } from "@/lib/dates";
import { browserTz } from "@/lib/clientTime";
import Icon from "./Icon";
import Summary from "./Summary";
import { emoLang, wordText } from "@/lib/emotions";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import SpendReview from "./SpendReview";
import type { WorkItem } from "@/lib/integrations/types";

type Review = { week: string; good: string; hard: string; plan: string; note: string; saved?: boolean };
type DiaryRow = { date: string; mood: string | null; emotions?: string[] };
type Usage = { id: string; first: string; count: number }[];
type Money = { date: string; amount: number }[];
const monthUrl = (ym: string) => `/api/month?ym=${ym}&tz=${encodeURIComponent(browserTz())}`;
const send = (method: string, body: unknown) => fetch("/api/review", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Sunday wrap-up: auto summary of the week (Mon–Sun) + a few free-text questions. */
export default function WeeklyReview({ sel, setSel }: { sel: string; setSel: (d: string) => void }) {
  const { t, fmt, locale } = useI18n();
  const lang = emoLang(locale);
  const week = mondayOf(sel), end = addDays(week, 7);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week]);
  const yms = [...new Set([week.slice(0, 7), addDays(week, 6).slice(0, 7)])];

  // ---- auto summary
  const m1 = useApi<MonthData>(monthUrl(yms[0])).data;
  const m2 = useApi<MonthData>(yms[1] ? monthUrl(yms[1]) : null).data;
  const d1 = useApi<DiaryRow[]>(`/api/diary?ym=${yms[0]}`).data;
  const d2 = useApi<DiaryRow[]>(yms[1] ? `/api/diary?ym=${yms[1]}` : null).data;
  const spent = useApi<Money>(`/api/expenses?from=${week}&to=${end}`).data;
  const earned = useApi<Money>(`/api/income?from=${week}&to=${end}`).data;
  const work = useApi<{ items: WorkItem[]; connected: string[] }>(`/api/work?from=${week}&to=${end}&tz=${encodeURIComponent(browserTz())}`).data;

  const stats = useMemo(() => {
    const byDay = { ...(m1?.days ?? {}), ...(m2?.days ?? {}) };
    let done = 0, total = 0, run = 0, best = 0;
    for (const d of days) {
      const x = byDay[d];
      if (!x || x.total === 0) continue; // days without tasks neither add nor break a streak (same rule as the stats tab)
      done += x.done; total += x.total;
      run = x.done / x.total >= 0.8 ? run + 1 : 0;
      best = Math.max(best, run);
    }
    const moods = [...(d1 ?? []), ...(d2 ?? [])].filter((r) => days.includes(r.date)).map((r) => Number(r.mood)).filter((n) => n > 0);
    return { rate: total ? done / total : null, best, mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null };
  }, [m1, m2, d1, d2, days]);
  // emotion words used this week, and how the user's vocabulary has grown (words first used this week / all-time total)
  const usage = useApi<Usage>("/api/emotions").data;
  const weekWords = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of [...(d1 ?? []), ...(d2 ?? [])]) if (days.includes(r.date)) for (const id of r.emotions ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [d1, d2, days]);
  const newWords = (usage ?? []).filter((u) => u.first >= week && u.first < end).length;
  const sum = (rows: Money | null) => (rows ?? []).reduce((s, r) => s + r.amount, 0);

  // ---- the review itself
  const { data, reload } = useApi<Review>(`/api/review?week=${week}`);
  const past = useApi<Review[]>("/api/review?list=1");
  const [f, setF] = useState({ good: "", hard: "", plan: "", note: "" });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set()); // past reviews shown in full
  const toggleWeek = (w: string) => setOpenWeeks((o) => { const n = new Set(o); if (n.has(w)) n.delete(w); else n.add(w); return n; });
  useEffect(() => {
    setF({ good: data?.good ?? "", hard: data?.hard ?? "", plan: data?.plan ?? "", note: data?.note ?? "" });
    setDirty(false);
  }, [data, week]);
  useEffect(() => { setSaved(false); }, [week]);
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setDirty(true); setSaved(false); };
  const save = async () => {
    await send("PUT", { week, ...f });
    await Promise.all([reload(), past.reload()]);
    setDirty(false); setSaved(true);
  };

  const range = `${fmt.monthDay(week)} – ${fmt.monthDay(addDays(week, 6))}`;
  const question = (k: keyof typeof f, label: string, rows: number) => (
    <label className="wk-q" key={k}><span>{label}</span>
      <textarea rows={rows} value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  return (
    <div className="wk">
      <div className="wk-head">
        <button className="btn icon" onClick={() => setSel(addDays(sel, -7))} aria-label={t("common.prev")}><Icon name="left" /></button>
        <h2>{range}</h2>
        <button className="btn icon" onClick={() => setSel(addDays(sel, 7))} aria-label={t("common.next")}><Icon name="right" /></button>
      </div>

      <Summary items={[
        [t("cal.rate"), stats.rate === null ? "-" : `${Math.round(stats.rate * 100)}%`],
        [t("cal.streak"), t("cal.days", { n: stats.best })],
        [t("inc.income"), fmt.money(sum(earned))],
        [t("cal.spent"), fmt.money(sum(spent))],
        [t("wk.mood"), stats.mood === null ? "-" : stats.mood.toFixed(1)],
      ]} />

      {work && work.connected.length > 0 && (
        <section className="wk-emo"><h3>{t("int.workTitle")}</h3><small className="muted">{t("int.weekWork", { n: work.items.reduce((s, w) => s + (w.count ?? 1), 0) })}</small></section>
      )}

      <section className="wk-emo">
        <h3>{t("emo.weekTitle")}</h3>
        {weekWords.length === 0 ? <small className="muted">{t("emo.none")}</small> : (
          <div className="emo-tags big">{weekWords.map(([id, n]) => <i key={id}>{wordText(id, lang)}{n > 1 && <em>×{n}</em>}</i>)}</div>
        )}
        <small className="muted">{t("emo.newWords", { n: newWords })} · {t("emo.vocab", { n: usage?.length ?? 0 })}</small>
      </section>

      <SpendReview week={week} />

      <div className="two wide-left">
        <section className="panel wk-form">
          {question("good", t("wk.good"), 4)}
          {question("hard", t("wk.hard"), 4)}
          {question("plan", t("wk.plan"), 2)}
          {question("note", t("wk.note"), 2)}
          <div className="row end gap-2">
            {saved && <small className="muted">{t("wk.saved")}</small>}
            <button className="btn primary" disabled={!dirty} onClick={save}>{t("common.save")}</button>
          </div>
        </section>

        <section className="list">
          <h3>{t("wk.past")}</h3>
          {(past.data ?? []).length === 0 && <p className="muted">{t("wk.empty")}</p>}
          {(past.data ?? []).map((r) => {
            const isOpen = openWeeks.has(r.week);
            const answers: [string, string][] = [[t("wk.good"), r.good], [t("wk.hard"), r.hard], [t("wk.plan"), r.plan], [t("wk.note"), r.note]];
            return (
              <div key={r.week} className={`item entry${r.week === week ? " on" : ""}${isOpen ? " open" : ""}`}>
                <button type="button" className="entry-head" aria-expanded={isOpen} onClick={() => toggleWeek(r.week)}>
                  <span className="row between"><b>{fmt.monthDay(r.week)} – {fmt.monthDay(addDays(r.week, 6))}</b><Icon name="right" size={16} /></span>
                  {!isOpen && <p>{r.good || r.hard || r.plan || r.note}</p>}
                </button>
                {isOpen && (
                  <div className="entry-body">
                    {answers.filter(([, v]) => v).map(([label, v]) => <div key={label}><small>{label}</small><p>{v}</p></div>)}
                    <div className="row end"><button type="button" className="btn" onClick={() => { setSel(r.week); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t("common.edit")}</button></div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
