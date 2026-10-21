import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { expenses, savings, workouts } from "@/lib/db";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { addDays, isYmd } from "@/lib/dates";
import { windowStart } from "@/lib/insights";

export const dynamic = "force-dynamic";
const WINDOW_DAYS = 180;

/**
 * ?today=YYYY-MM-DD → the dates (last 180 days) with a workout, with an unneeded expense and with money set aside, so the
 * "My emotions" screen can set them next to the emotion days. Only dates are read: no text, memo or amount leaves the server.
 */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const today = new URL(req.url).searchParams.get("today");
  if (!isYmd(today)) return bad("bad input");
  const from = windowStart(today, WINDOW_DAYS);
  const to = addDays(today, 1);
  const [sessions, spent, saved] = await Promise.all([workouts.dates(u.id, from, today), expenses.slim(u.id, from, to), savings.slim(u.id, from, to)]);
  const unneeded = [...new Set(spent.filter((e) => !e.need).map((e) => e.date))];
  return NextResponse.json({ exercise: [...new Set(sessions)], unneeded, saved: [...new Set(saved.map((r) => r.date))], from }, { headers: privateCache });
}
