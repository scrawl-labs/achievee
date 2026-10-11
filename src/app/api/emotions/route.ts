import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { diary } from "@/lib/db";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** The user's emotion vocabulary so far: every word they have used, when they first used it, and how often. */
export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  const seen = new Map<string, { id: string; first: string; count: number }>();
  for (const day of await diary.emotionDays(u.id)) {
    for (const id of day.ids) {
      const e = seen.get(id);
      if (e) e.count++;
      else seen.set(id, { id, first: day.date, count: 1 });
    }
  }
  return NextResponse.json([...seen.values()]);
}
