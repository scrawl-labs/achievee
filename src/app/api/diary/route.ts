import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { diary } from "@/lib/db";

export const dynamic = "force-dynamic";
const YM = /^\d{4}-(0[1-9]|1[0-2])$/, YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const ym = new URL(req.url).searchParams.get("ym") ?? "";
  if (!YM.test(ym)) return NextResponse.json({ error: "bad ym" }, { status: 400 });
  return NextResponse.json(diary.month((await getUser()).id, ym));
}

export async function PUT(req: Request) {
  const { date, mood, body } = await req.json();
  if (!YMD.test(date) || typeof body !== "string") return NextResponse.json({ error: "bad input" }, { status: 400 });
  const u = await getUser();
  if (body.trim() === "" && !mood) diary.remove(u.id, date);
  else diary.upsert(u.id, date, mood ?? null, body.slice(0, 5000));
  return NextResponse.json({ ok: true });
}
