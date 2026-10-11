import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { expenses } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";
const YM = /^\d{4}-(0[1-9]|1[0-2])$/, YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const ym = new URL(req.url).searchParams.get("ym") ?? "";
  if (!YM.test(ym)) return bad("bad ym");
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json(await expenses.month(u.id, ym));
}

export async function POST(req: Request) {
  const { date, category, memo, amount, need } = await req.json();
  if (!YMD.test(date) || !category || !Number.isInteger(amount) || amount <= 0 || amount > 1_000_000_000) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await expenses.add(u.id, date, String(category).slice(0, 20), String(memo ?? "").slice(0, 100), amount, need !== false);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const b = await req.json();
  const { id, need } = b;
  if (!Number.isInteger(id) || typeof need !== "boolean") return bad("bad input");
  const full = "date" in b || "category" in b || "amount" in b || "memo" in b;
  if (full && (!YMD.test(b.date) || !b.category || !Number.isInteger(b.amount) || b.amount <= 0 || b.amount > 1_000_000_000)) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  if (full) await expenses.update(u.id, id, { date: b.date, category: String(b.category).slice(0, 20), memo: String(b.memo ?? "").slice(0, 100), amount: b.amount, need });
  else await expenses.setNeed(u.id, id, need);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return bad("bad id");
  const u = await getUser();
  if (!u) return unauthorized();
  await expenses.remove(u.id, id);
  return NextResponse.json({ ok: true });
}
