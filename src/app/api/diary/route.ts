import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { diary } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";
const YM = /^\d{4}-(0[1-9]|1[0-2])$/, YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const ym = new URL(req.url).searchParams.get("ym") ?? "";
  if (!YM.test(ym)) return bad("bad ym");
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json(await diary.month(u.id, ym));
}

export async function PUT(req: Request) {
  const { date, mood, body } = await req.json();
  if (!YMD.test(date) || typeof body !== "string") return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  if (body.trim() === "" && !mood) await diary.remove(u.id, date);
  else await diary.upsert(u.id, date, mood ? String(mood).slice(0, 1) : null, body.slice(0, 5000));
  return NextResponse.json({ ok: true });
}
