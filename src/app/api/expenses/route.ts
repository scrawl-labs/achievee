import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { expenses } from "@/lib/db";

export const dynamic = "force-dynamic";
const YM = /^\d{4}-(0[1-9]|1[0-2])$/, YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const ym = new URL(req.url).searchParams.get("ym") ?? "";
  if (!YM.test(ym)) return NextResponse.json({ error: "bad ym" }, { status: 400 });
  return NextResponse.json(expenses.month((await getUser()).id, ym));
}

export async function POST(req: Request) {
  const { date, category, memo, amount } = await req.json();
  if (!YMD.test(date) || !category || !Number.isInteger(amount) || amount <= 0)
    return NextResponse.json({ error: "bad input" }, { status: 400 });
  expenses.add((await getUser()).id, date, String(category).slice(0, 20), String(memo ?? "").slice(0, 100), amount);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  expenses.remove((await getUser()).id, id);
  return NextResponse.json({ ok: true });
}
