import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { reviews } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const isMonday = (d: string) => YMD.test(d) && new Date(`${d}T00:00:00Z`).getUTCDay() === 1;
const text = (v: unknown) => String(v ?? "").slice(0, 3000);

/** ?week=<Monday> → that week's review (empty fields + saved:false when none); ?list=1 → recent reviews. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const u = await getUser();
  if (!u) return unauthorized();
  if (p.get("list")) return NextResponse.json(await reviews.list(u.id, 12));
  const week = p.get("week") ?? "";
  if (!isMonday(week)) return bad("bad week");
  const r = await reviews.get(u.id, week);
  return NextResponse.json(r ? { ...r, saved: true } : { week, good: "", hard: "", plan: "", note: "", saved: false });
}

export async function PUT(req: Request) {
  const b = await req.json();
  if (!isMonday(b.week)) return bad("bad week");
  const r = { week: b.week as string, good: text(b.good), hard: text(b.hard), plan: text(b.plan), note: text(b.note) };
  const u = await getUser();
  if (!u) return unauthorized();
  if (!r.good.trim() && !r.hard.trim() && !r.plan.trim() && !r.note.trim()) await reviews.remove(u.id, r.week);
  else await reviews.upsert(u.id, r);
  return NextResponse.json({ ok: true });
}
