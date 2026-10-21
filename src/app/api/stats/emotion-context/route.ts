import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { expenses, workouts } from "@/lib/db";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { addDays, isYmd } from "@/lib/dates";
import { windowStart } from "@/lib/insights";

export const dynamic = "force-dynamic";
const WINDOW_DAYS = 180;

/**
 * ?today=YYYY-MM-DD → the dates (last 180 days) with a workout and the dates with an unneeded expense, so the
 * "My emotions" screen can set them next to the emotion days. Only dates are read: no text, memo or amount leaves the server.
 */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const today = new URL(req.url).searchParams.get("today");
  if (!isYmd(today)) return bad("bad input");
  const from = windowStart(today, WINDOW_DAYS);
  const [sessions, spent] = await Promise.all([workouts.dates(u.id, from, today), expenses.slim(u.id, from, addDays(today, 1))]);
  const unneeded = [...new Set(spent.filter((e) => !e.need).map((e) => e.date))];
  return NextResponse.json({ exercise: [...new Set(sessions)], unneeded, from }, { headers: privateCache });
}
