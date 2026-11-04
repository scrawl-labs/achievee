import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { diary } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { cleanEmotionIds, mergeEmotionIds, moodFromEmotions } from "@/lib/emotions";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY = 5000;

/**
 * Adds to a day's diary without replacing what is already there (used by Mallow's /mallow page):
 * emotion words fill the free places (the day's own words stay), and a note is added after any text already written.
 * Answers which words were added and which did not fit.
 */
export async function POST(req: Request) {
  const { date, emotions, note } = await req.json().catch(() => ({}));
  const ids = cleanEmotionIds(emotions);
  const text = typeof note === "string" ? note.trim().slice(0, MAX_BODY) : "";
  if (typeof date !== "string" || !YMD.test(date) || (ids.length === 0 && !text)) return bad("bad input");
  const u = await getUser();
  if (!u) return unauthorized();
  const day = await diary.day(u.id, date);
  const { ids: merged, added, left } = mergeEmotionIds(day?.emotions ?? [], ids);
  const before = day?.body?.trim() ?? "";
  const body = text ? (before ? `${before}\n\n${text}` : text).slice(0, MAX_BODY) : day?.body ?? "";
  if (added.length || text) {
    const mood = moodFromEmotions(merged);
    await diary.upsert(u.id, date, mood ? String(mood) : day?.mood ?? null, body, merged);
  }
  return NextResponse.json({ added, left, emotions: merged, noted: !!text });
}
