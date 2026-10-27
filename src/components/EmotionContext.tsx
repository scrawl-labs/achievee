"use client";
import { MIN_FAMILY_DAYS, contexts, tallies } from "@/lib/emotionContext";
import { emoLang, familyById } from "@/lib/emotions";
import { todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Day = { date: string; mood: string | null; ids: string[] };
type Ctx = { exercise: string[]; unneeded: string[]; from: string };

/** Which feelings go with exercise days, unneeded spending and saving days. Said as a tendency, and only once both sides have enough days. */
export default function EmotionContext({ spaced = false }: { spaced?: boolean }) {
  const { t, locale } = useI18n();
  const lang = emoLang(locale);
  const { data } = useApi<Day[]>("/api/emotions?days=1");
  const { data: ctx } = useApi<Ctx>(`/api/stats/emotion-context?today=${todayStr()}`);
  if (!data || !ctx || data.length === 0) return null;
  const days = data.filter((d) => d.date >= ctx.from);
  const groups = [
    { key: "emo.cEx" as const, rows: contexts(days, new Set(ctx.exercise)) },
    { key: "emo.cWs" as const, rows: contexts(days, new Set(ctx.unneeded)) },
  ];
  const pct = (x: number) => Math.round(x * 100);
  const none = groups.every((g) => g.rows.length === 0);
  const counts = none ? tallies(days, { exercise: new Set(ctx.exercise), unneeded: new Set(ctx.unneeded) }) : [];
  return (
    <section className={`panel${spaced ? " pattern" : ""}`}>
      <h3>{t("emo.cTitle")}</h3>
      {none ? (
        <>
          {counts.length > 0 && (
            <ul className="peaks">
              {counts.map((c) => <li key={c.family}>{t("emo.cTally", { f: familyById(c.family)?.[lang] ?? "", n: c.days, a: c.exercise, b: c.unneeded })}</li>)}
            </ul>
          )}
          <small className="muted">{t("emo.cNeed", { n: MIN_FAMILY_DAYS })}</small>
        </>
      ) : (
        <ul className="peaks">
          {groups.flatMap((g) => g.rows.map((c) => (
            <li key={g.key + c.family}>{t(g.key, { f: familyById(c.family)?.[lang] ?? "", a: pct(c.withRate), b: pct(c.otherRate) })}</li>
          )))}
        </ul>
      )}
      <small className="muted">{t("emo.cNote")}</small>
    </section>
  );
}
