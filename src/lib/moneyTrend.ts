import { addMonths } from "./dates";
import { categoryOf } from "./i18n";
import { periodOf } from "./period";

/** Several pay periods side by side: what came in, what went to fixed costs and to spending you can change, what was set aside. Pure. */
export type MoneyRange = { from: string; to: string }; // `to` exclusive
export type ExpenseSlim = { date: string; category: string; amount: number; need: number | boolean };
export type AmountSlim = { date: string; amount: number };
export type PeriodMoney = {
  from: string; to: string;
  income: number; fixed: number; variable: number; waste: number; saved: number;
  savingRate: number | null;   // saved / income, null when nothing came in
  wasteRatio: number | null;   // unneeded part of the spending you can change, null when there is none
};

/** The last `n` periods ending with the one that contains `anchor`, oldest first. */
export function periodsBack(anchor: string, startDay: number, n: number): MoneyRange[] {
  const out: MoneyRange[] = [];
  let cursor = periodOf(anchor, startDay);
  for (let i = 0; i < n; i++) {
    out.unshift(cursor);
    cursor = periodOf(addMonths(`${cursor.from.slice(0, 7)}-01`, -1).slice(0, 7) + `-${cursor.from.slice(8)}`, startDay);
  }
  return out;
}

const within = (date: string, r: MoneyRange) => date >= r.from && date < r.to;
const sum = (rows: readonly { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

export function moneyTrend(
  rows: { expenses: readonly ExpenseSlim[]; income: readonly AmountSlim[]; savings: readonly AmountSlim[] },
  ranges: readonly MoneyRange[],
): PeriodMoney[] {
  return ranges.map((r) => {
    const exp = rows.expenses.filter((e) => within(e.date, r));
    const fixed = sum(exp.filter((e) => categoryOf(e.category) === "fixed"));
    const variableRows = exp.filter((e) => categoryOf(e.category) !== "fixed");
    const variable = sum(variableRows), waste = sum(variableRows.filter((e) => !e.need));
    const income = sum(rows.income.filter((e) => within(e.date, r))), saved = sum(rows.savings.filter((e) => within(e.date, r)));
    return {
      ...r, income, fixed, variable, waste, saved,
      savingRate: income > 0 ? saved / income : null,
      wasteRatio: variable > 0 ? waste / variable : null,
    };
  });
}

/** Averages over the periods that have something to average (periods with no income do not drag the saving rate down). */
export function trendAverages(periods: readonly PeriodMoney[]) {
  const rates = periods.map((p) => p.savingRate).filter((v): v is number => v !== null);
  const spending = periods.filter((p) => p.variable > 0);
  return {
    savingRate: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
    variable: spending.length ? Math.round(spending.reduce((s, p) => s + p.variable, 0) / spending.length) : null,
  };
}
