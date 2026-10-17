import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { expenses, income, savings } from "@/lib/db";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { isYmd } from "@/lib/dates";
import { moneyTrend, periodsBack } from "@/lib/moneyTrend";

export const dynamic = "force-dynamic";
const MAX_PERIODS = 12;

/**
 * ?anchor=YYYY-MM-DD&startDay=1..28&n=1..12 → the last n pay periods (ending with the one that holds the anchor), oldest first,
 * each with income, fixed costs, spending you can change, the unneeded part of it, and what was set aside.
 * Only dates, categories and amounts are read: no memo is fetched or decrypted.
 */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const p = new URL(req.url).searchParams;
  const anchor = p.get("anchor"), startDay = Number(p.get("startDay") ?? 1), n = Number(p.get("n") ?? 6);
  if (!isYmd(anchor) || !Number.isInteger(startDay) || startDay < 1 || startDay > 28 || !Number.isInteger(n) || n < 1 || n > MAX_PERIODS) return bad("bad input");
  const ranges = periodsBack(anchor, startDay, n);
  const from = ranges[0].from, to = ranges[ranges.length - 1].to;
  const [exp, inc, sav] = await Promise.all([expenses.slim(u.id, from, to), income.slim(u.id, from, to), savings.slim(u.id, from, to)]);
  return NextResponse.json({ periods: moneyTrend({ expenses: exp, income: inc, savings: sav }, ranges) }, { headers: privateCache });
}
