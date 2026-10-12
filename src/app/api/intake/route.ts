import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { intake } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { INTAKE_MAX, isIntakeKind } from "@/lib/intake";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Daily intake totals (water in ml, protein in g). */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "", to = p.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to <= from || Date.parse(to) - Date.parse(from) > 62 * 864e5) return bad("bad range");
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json(await intake.range(u.id, from, to));
}

/** Add to (or take away from) a day's total with a quick-add button. The total never goes below zero. */
export async function POST(req: Request) {
  const { date, kind, delta } = await req.json();
  if (!YMD.test(date) || !isIntakeKind(kind) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > INTAKE_MAX[kind]) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await intake.add(u.id, date, kind, delta);
  return NextResponse.json({ ok: true });
}

/** Set a day's total exactly (fixing a mistake). */
export async function PUT(req: Request) {
  const { date, kind, amount } = await req.json();
  if (!YMD.test(date) || !isIntakeKind(kind) || !Number.isInteger(amount) || amount < 0 || amount > INTAKE_MAX[kind]) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await intake.set(u.id, date, kind, amount);
  return NextResponse.json({ ok: true });
}
