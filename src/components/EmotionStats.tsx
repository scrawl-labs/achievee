"use client";
import { useMemo } from "react";
import { dow } from "@/lib/dates";
import { FAMILIES, WORDS, emoLang, wordById, wordText } from "@/lib/emotions";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Day = { date: string; mood: string | null; ids: string[] };
const BARS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)"];
const MIN_FOR_PATTERN = 3; // a weekday pattern needs a few samples to mean anything
const monIdx = (date: string) => (dow(date) + 6) % 7; // Monday = 0
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

/** "My emotions": which words you reach for, when, and with what mood — computed from your own diary entries. */
export default function EmotionStats() {
  const { t, fmt, locale } = useI18n();
  const lang = emoLang(locale);
  const { data } = useApi<Day[]>("/api/emotions?days=1");

  const s = useMemo(() => {
    const days = data ?? [];
    const count = new Map<string, number>(), byWeekday = new Map<string, number[]>(), moods = new Map<string, number[]>();
    const weekdayAll = Array(7).fill(0) as number[], family = new Map<string, number>(), pairs = new Map<string, number>();
    for (const d of days) {
      const wd = monIdx(d.date), mood = Number(d.mood) > 0 ? Number(d.mood) : null;
      for (const id of d.ids) {
        count.set(id, (count.get(id) ?? 0) + 1);
        (byWeekday.get(id) ?? byWeekday.set(id, Array(7).fill(0)).get(id)!)[wd]++;
        if (mood) (moods.get(id) ?? moods.set(id, []).get(id)!).push(mood);
        weekdayAll[wd]++;
        const fam = wordById(id)?.family;
        if (fam) family.set(fam, (family.get(fam) ?? 0) + 1);
      }
      const ids = [...d.ids].sort();
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) pairs.set(`${ids[i]}|${ids[j]}`, (pairs.get(`${ids[i]}|${ids[j]}`) ?? 0) + 1);
    }
    const top = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const avg = (id: string) => { const m = moods.get(id); return m && m.length ? m.reduce((a, b) => a + b, 0) / m.length : null; };
    const peaks = top.filter(([, n]) => n >= MIN_FOR_PATTERN).map(([id, n]) => {
      const w = byWeekday.get(id)!, best = Math.max(...w);
      return { id, n, day: MON_FIRST[w.indexOf(best)], hits: best };
    }).filter((p) => p.hits >= 2); // one lonely occurrence is not a pattern
    const topPairs = [...pairs.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { days: days.length, vocab: count.size, top, avg, peaks, weekdayAll, family, topPairs };
  }, [data]);

  if (data && data.length === 0) return <p className="muted">{t("emo.statsEmpty")}</p>;
  if (!data) return null;

  const fams = FAMILIES.map((f) => ({ f, v: s.family.get(f.id) ?? 0 })).filter((x) => x.v).sort((a, b) => b.v - a.v);
  const famMax = fams[0]?.v ?? 1, wdMax = Math.max(...s.weekdayAll, 1);

  return (
    <div className="estats">
      <dl className="summary">
        <div><dd>{s.vocab}<small> / {WORDS.length}</small></dd><dt>{t("emo.statsVocab", { n: s.vocab, total: WORDS.length })}</dt></div>
        <div><dd>{s.days}</dd><dt>{t("emo.statsDays", { n: s.days })}</dt></div>
      </dl>

      <div className="two">
        <section className="panel">
          <h3>{t("emo.statsTop")}</h3>
          {s.top.map(([id, n]) => {
            const m = s.avg(id);
            return (
              <div className="hbar" key={id}>
                <span>{wordText(id, lang)}</span>
                <div><i style={{ width: `${(n / s.top[0][1]) * 100}%`, ["--bar" as string]: "var(--c5)" }} /></div>
                <em>{n}{m !== null ? ` · ${t("emo.statsMood")} ${m.toFixed(1)}` : ""}</em>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <h3>{t("emo.statsWhen")}</h3>
          {s.peaks.length === 0 ? <p className="muted">{t("emo.statsMin")}</p> : (
            <ul className="peaks">
              {s.peaks.map((p) => (
                <li key={p.id}>{t("emo.statsPeak", { w: wordText(p.id, lang), d: fmt.weekdayLong(p.day), n: p.hits, t: p.n })}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="two">
        <section className="panel">
          <h3>{t("emo.statsFamily")}</h3>
          {fams.map(({ f, v }, i) => (
            <div className="hbar" key={f.id}><span>{f[lang]}</span><div><i style={{ width: `${(v / famMax) * 100}%`, ["--bar" as string]: BARS[i % BARS.length] }} /></div><em>{v}</em></div>
          ))}
        </section>

        <section className="panel">
          <h3>{t("emo.statsWeekday")}</h3>
          {MON_FIRST.map((d, i) => (
            <div className="hbar" key={d}><span>{fmt.weekdayShort(d)}</span><div><i style={{ width: `${(s.weekdayAll[i] / wdMax) * 100}%`, ["--bar" as string]: "var(--c6)" }} /></div><em>{s.weekdayAll[i]}</em></div>
          ))}
        </section>
      </div>

      {s.topPairs.length > 0 && (
        <section className="panel">
          <h3>{t("emo.statsPairs")}</h3>
          <ul className="peaks">
            {s.topPairs.map(([k, n]) => {
              const [a, b] = k.split("|");
              return <li key={k}>{wordText(a, lang)} + {wordText(b, lang)} <small>×{n}</small></li>;
            })}
          </ul>
        </section>
      )}
      <p className="muted">{t("emo.statsMin")}</p>
    </div>
  );
}
