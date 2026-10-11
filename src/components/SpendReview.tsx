"use client";
import { CATEGORIES, type Key, categoryOf } from "@/lib/i18n";
import { addDays } from "@/lib/dates";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

type Exp = { id: number; date: string; category: string; memo: string; amount: number; need: number };
const BARS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)", "var(--c6)", "var(--fg-3)"]; // same order as CATEGORIES
const sum = (rs: { amount: number }[]) => rs.reduce((s, r) => s + r.amount, 0);

/**
 * A look back at the week's spending: fixed costs kept apart from the spending you can change, where the most went,
 * the biggest single expense, what was marked unneeded, and how it compares with last week. Savings and investing are not spending.
 */
export default function SpendReview({ week }: { week: string }) {
  const { t, fmt } = useI18n();
  const end = addDays(week, 7);
  const rows = useApi<Exp[]>(`/api/expenses?from=${week}&to=${end}`).data;
  const last = useApi<Exp[]>(`/api/expenses?from=${addDays(week, -7)}&to=${week}`).data;
  if (!rows) return null;

  const fixed = rows.filter((r) => categoryOf(r.category) === "fixed");
  const variable = rows.filter((r) => categoryOf(r.category) !== "fixed");
  const varTotal = sum(variable), fixedTotal = sum(fixed);
  const byCat = CATEGORIES.map((c, i) => ({ c, i, v: sum(variable.filter((r) => categoryOf(r.category) === c)) })).filter((x) => x.v).sort((a, b) => b.v - a.v).slice(0, 3);
  const biggest = [...variable].sort((a, b) => b.amount - a.amount)[0];
  const waste = variable.filter((r) => !r.need).sort((a, b) => b.amount - a.amount);
  const lastVar = last ? sum(last.filter((r) => categoryOf(r.category) !== "fixed")) : null;
  const diff = lastVar === null ? null : varTotal - lastVar;
  const catName = (c: string) => t(`cat.${categoryOf(c)}` as Key);

  return (
    <section className="wk-emo spendrev">
      <h3>{t("wk.spend")}</h3>
      {rows.length === 0 ? <small className="muted">{t("wk.spendNone")}</small> : (
        <>
          <div className="spend-sum">
            <div><small>{t("wk.variable")}</small><b>{fmt.money(varTotal)}</b></div>
            {fixedTotal > 0 && <div><small>{t("wk.fixed")}</small><b>{fmt.money(fixedTotal)}</b></div>}
            {diff !== null && lastVar! > 0 && (
              <div><small>{t("wk.vsLast")}</small><b className={diff > 0 ? "up" : diff < 0 ? "down" : ""}>{diff === 0 ? t("wk.same") : `${diff > 0 ? "+" : "−"}${fmt.money(Math.abs(diff))}`}</b></div>
            )}
          </div>

          {byCat.length > 0 && (
            <div className="spend-block">
              <small>{t("wk.topCat")}</small>
              {byCat.map(({ c, i, v }) => (
                <div className="hbar" key={c}><span>{catName(c)}</span><div><i style={{ width: `${(v / varTotal) * 100}%`, ["--bar" as string]: BARS[i] }} /></div><em>{fmt.money(v)}</em></div>
              ))}
            </div>
          )}

          {biggest && (
            <div className="spend-block">
              <small>{t("wk.biggest")}</small>
              <div className="spend-row"><span><b>{fmt.monthDay(biggest.date)}</b> {catName(biggest.category)}{biggest.memo && ` · ${biggest.memo}`}</span><b className="num">{fmt.money(biggest.amount)}</b></div>
            </div>
          )}

          <div className="spend-block">
            <small>{t("wk.wasteList")}{waste.length > 0 && ` · ${fmt.money(sum(waste))}`}</small>
            {waste.length === 0 ? <span className="muted">{t("wk.wasteNone")}</span> : waste.slice(0, 5).map((r) => (
              <div className="spend-row" key={r.id}><span><b>{fmt.monthDay(r.date)}</b> {catName(r.category)}{r.memo && ` · ${r.memo}`}</span><b className="num">{fmt.money(r.amount)}</b></div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
