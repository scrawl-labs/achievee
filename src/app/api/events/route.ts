import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { fetchRange } from "@/lib/google";
import { nativeEvents } from "@/lib/db";
import { toDayEvent } from "@/lib/nativeEvents";
import { mergeEvents } from "@/lib/calendarSources";
import type { DayEvent } from "@/lib/types";
import { resolveGoogleAccess } from "@/lib/googleToken";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { safeTz } from "@/lib/tz";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" }; // a revoked/none answer must not be replayed after the user reconnects
const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Own events are an overlay: if reading them fails, Google still answers (they reappear on the next load). Fixed message only. */
async function ownEvents(user: string, from: string, to: string): Promise<{ events: DayEvent[]; ok: boolean }> {
  try { return { events: (await nativeEvents.range(user, from, to)).map(toDayEvent), ok: true }; } catch {
    console.warn("events: own events unavailable, showing Google events only");
    return { events: [], ok: false };
  }
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "", to = p.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to <= from) return bad("bad range");
  const u = await getUser();
  if (!u) return unauthorized();
  const own = ownEvents(u.id, from, to); // runs alongside the Google calls; never rejects
  try {
    const access = await resolveGoogleAccess(u);
    // The body is a bare array, so the revoked/none flag travels as a header instead of an extra field.
    if (access.status !== "ok") return NextResponse.json((await own).events, { headers: { ...noStore, "X-Google-Status": access.status } });
    const google = await fetchRange(from, to, access.accessToken, safeTz(p.get("tz")));
    const { events, ok } = await own;
    // An answer built without the own events is incomplete: never let the browser cache it.
    return NextResponse.json(mergeEvents(google, events), { headers: ok ? privateCache : noStore });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
