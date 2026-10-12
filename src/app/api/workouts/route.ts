import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { workouts } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { WORKOUT_KINDS, type WorkoutKind } from "@/lib/workout";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const validKind = (k: unknown): k is WorkoutKind => (WORKOUT_KINDS as readonly unknown[]).includes(k);
const validMinutes = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 1000;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "", to = p.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to <= from || Date.parse(to) - Date.parse(from) > 62 * 864e5) return bad("bad range");
  const u = await getUser();
  if (!u) return unauthorized();
  return NextResponse.json(await workouts.range(u.id, from, to));
}

export async function POST(req: Request) {
  const { date, kind, minutes, memo } = await req.json();
  if (!YMD.test(date) || !validKind(kind) || !validMinutes(minutes)) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await workouts.add(u.id, date, kind, minutes, String(memo ?? "").slice(0, 200));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { id, date, kind, minutes, memo } = await req.json();
  if (!Number.isInteger(id) || !YMD.test(date) || !validKind(kind) || !validMinutes(minutes)) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  await workouts.update(u.id, id, { date, kind, minutes, memo: String(memo ?? "").slice(0, 200) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return bad("bad id");
  const u = await getUser();
  if (!u) return unauthorized();
  await workouts.remove(u.id, id);
  return NextResponse.json({ ok: true });
}
