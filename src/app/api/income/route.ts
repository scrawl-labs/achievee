import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { income } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const validAmount = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 1_000_000_000_000 / 1000;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "", to = p.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to <= from || Date.parse(to) - Date.parse(from) > 62 * 864e5) return bad("bad range");
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json(await income.range(u.id, from, to));
}

export async function POST(req: Request) {
  const { date, memo, amount } = await req.json();
  if (!YMD.test(date) || !validAmount(amount)) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await income.add(u.id, date, String(memo ?? "").slice(0, 100), amount);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { id, date, memo, amount } = await req.json();
  if (!Number.isInteger(id) || !YMD.test(date) || !validAmount(amount)) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await income.update(u.id, id, { date, memo: String(memo ?? "").slice(0, 100), amount });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return bad("bad id");
  const u = await getUser();
  if (!u) return unauthorized();
  await income.remove(u.id, id);
  return NextResponse.json({ ok: true });
}
