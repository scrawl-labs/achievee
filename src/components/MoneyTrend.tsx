"use client";
import { addDays } from "@/lib/dates";
import { trendAverages, type PeriodMoney } from "@/lib/moneyTrend";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";

const COLORS = { fixed: "var(--c6)", variable: "var(--c1)", saved: "var(--c3)" };

/**
 * The last six pay periods side by side: fixed costs, spending you can change, and what was set aside, against what came in.
 * Savings are never part of spending here. A period without income simply shows no saving rate.
 */
export default function MoneyTrend({ anchor, startDay }: { anchor: string; startDay: number }) {
  const { t, fmt, locale } = useI18n();
  const { data } = useApi<{ periods: PeriodMoney[] }>(`/api/trends/money?anchor=${anchor}&startDay=${startDay}&n=6`);
  const periods = data?.periods;
  if (!periods || periods.every((p) => p.income + p.fixed + p.variable + p.saved === 0)) return null;

  const total = (p: PeriodMoney) => p.fixed + p.variable + p.saved;
  const scale = Math.max(1, ...periods.map((p) => Math.max(p.income, total(p))));
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const label = (p: PeriodMoney) => month.format(new Date(`${addDays(p.to, -1)}T00:00:00Z`));
  const avg = trendAverages(periods);
  const pct = (n: number) => `${(n / scale) * 100}%`;

  return (
    <section className="panel mtrend">
      <h3>{t("mt.title")}</h3>
      <div className="mt-rows">
        {periods.map((p) => (
          <div className="mt-row" key={p.from} title={`${p.from} – ${addDays(p.to, -1)}\n${t("inc.income")} ${fmt.money(p.income)}\n${t("wk.fixed")} ${fmt.money(p.fixed)}\n${t("wk.variable")} ${fmt.money(p.variable)}\n${t("sav.title")} ${fmt.money(p.saved)}`}>
            <span>{label(p)}</span>
            <div className="mt-bar">
              <i style={{ width: pct(p.fixed), background: COLORS.fixed }} />
              <i style={{ width: pct(p.variable), background: COLORS.variable }} />
              <i style={{ width: pct(p.saved), background: COLORS.saved }} />
              {p.income > 0 && <b className="mt-income" style={{ left: pct(p.income) }} aria-hidden="true" />}
            </div>
            <em>{p.savingRate === null ? "-" : `${Math.round(p.savingRate * 100)}%`}</em>
          </div>
        ))}
      </div>
      <div className="mt-legend">
        <span><i style={{ background: COLORS.fixed }} />{t("wk.fixed")}</span>
        <span><i style={{ background: COLORS.variable }} />{t("wk.variable")}</span>
        <span><i style={{ background: COLORS.saved }} />{t("sav.title")}</span>
        <span><b />{t("inc.income")}</span>
        <span className="mt-rate">{t("mt.rate")}</span>
      </div>
      {(avg.savingRate !== null || avg.variable !== null) && (
        <small className="muted">{t("mt.avg", { rate: avg.savingRate === null ? "-" : `${Math.round(avg.savingRate * 100)}%`, spend: avg.variable === null ? "-" : fmt.money(avg.variable) })}</small>
      )}
    </section>
  );
}
