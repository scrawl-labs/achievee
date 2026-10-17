import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { body, diary, expenses, workouts } from "@/lib/db";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { addDays, isYmd } from "@/lib/dates";
import { bodyVsWorkout, moodPatterns, windowStart } from "@/lib/insights";

export const dynamic = "force-dynamic";
const WINDOW_DAYS = 120;
const BODY_READINGS = 7; // → at most six stretches between readings

/**
 * ?today=YYYY-MM-DD (the viewer's local date) → what went together over the last 120 days (mood on exercise days vs other days,
 * mood on days with an unneeded expense vs other days) and body-fat change between recent readings next to the exercise in between.
 * Only dates, moods, amounts flags and body numbers are read: no diary text, memo or emotion word is fetched or decrypted.
 */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const today = new URL(req.url).searchParams.get("today");
  if (!isYmd(today)) return bad("bad input");
  const from = windowStart(today, WINDOW_DAYS), to = addDays(today, 1);

  const readings = (await body.list(u.id, 120)).filter((r) => r.fat !== undefined).slice(0, BODY_READINGS); // newest first
  const bodyFrom = readings.length ? readings[readings.length - 1].date : today;
  const sessionsFrom = bodyFrom < from ? bodyFrom : from; // body stretches may reach back past the mood window
  const [moods, sessions, spent] = await Promise.all([
    diary.moods(u.id, from, today), workouts.dates(u.id, sessionsFrom, today), expenses.slim(u.id, from, to),
  ]);

  const inWindow = (d: string) => d >= from;
  const patterns = moodPatterns(moods, sessions.filter(inWindow), spent.filter((e) => !e.need && inWindow(e.date)).map((e) => e.date));
  return NextResponse.json({ patterns, body: bodyVsWorkout(readings, sessions), windowDays: WINDOW_DAYS }, { headers: privateCache });
}
