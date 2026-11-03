import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { diary } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { cleanEmotionIds, mergeEmotionIds, moodFromEmotions } from "@/lib/emotions";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Adds emotion words to a day's diary without touching what is already written there (used by Bori's /bori page).
 * The day's own words stay; new ones fill the free places. Answers which were added and which did not fit.
 */
export async function POST(req: Request) {
  const { date, emotions } = await req.json().catch(() => ({}));
  const ids = cleanEmotionIds(emotions);
  if (typeof date !== "string" || !YMD.test(date) || ids.length === 0) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  const day = await diary.day(u.id, date);
  const { ids: merged, added, left } = mergeEmotionIds(day?.emotions ?? [], ids);
  if (added.length) {
    const mood = moodFromEmotions(merged);
    await diary.upsert(u.id, date, mood ? String(mood) : day?.mood ?? null, day?.body ?? "", merged);
  }
  return NextResponse.json({ added, left, emotions: merged });
}
