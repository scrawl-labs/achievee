import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { emptyMonthDays, fetchMonth } from "@/lib/google";
import { resolveGoogleAccess } from "@/lib/googleToken";
import { nativeEvents, todos } from "@/lib/db";
import { mergeNativeIntoMonth, type NativeEventRow } from "@/lib/nativeEvents";
import { mergeTodoCounts, type TodoCountRow } from "@/lib/todos";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { safeTz } from "@/lib/tz";
import type { MonthData } from "@/lib/types";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" }; // a revoked/none answer must not be replayed after the user reconnects

/**
 * Own todos are an overlay on the calendar: if reading them fails, the month still answers with the Google data
 * (counts then miss the own todos until the next successful load). Fixed message only, never the error or any value.
 */
async function ownTodoCounts(user: string, ym: string): Promise<{ counts: readonly TodoCountRow[]; ok: boolean }> {
  try { return { counts: await todos.monthCounts(user, ym), ok: true }; } catch {
    console.warn("month: own todos unavailable, showing Google data only");
    return { counts: [], ok: false };
  }
}

/** Same overlay rule as the own todos: a failed read never takes the month down. */
async function ownEventRows(user: string, ym: string): Promise<{ rows: readonly NativeEventRow[]; ok: boolean }> {
  try { return { rows: await nativeEvents.month(user, ym), ok: true }; } catch {
    console.warn("month: own events unavailable, showing Google data only");
    return { rows: [], ok: false };
  }
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const ym = p.get("ym") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return bad("bad ym");
  const u = await getUser();
  if (!u) return unauthorized();
  const own = ownTodoCounts(u.id, ym); // started now so it runs alongside the Google calls; never rejects
  const ownEv = ownEventRows(u.id, ym);
  try {
    const access = await resolveGoogleAccess(u);
    if (access.status !== "ok") {
      const days = mergeNativeIntoMonth(mergeTodoCounts(emptyMonthDays(ym), (await own).counts), (await ownEv).rows);
      return NextResponse.json({ ym, days, google: access.status } satisfies MonthData, { headers: noStore });
    }
    const google = await fetchMonth(ym, access.accessToken, safeTz(p.get("tz")));
    const { counts, ok } = await own;
    const ev = await ownEv;
    // An answer built without the own todos or events is incomplete: never let the browser cache it.
    return NextResponse.json({ ym, days: mergeNativeIntoMonth(mergeTodoCounts(google, counts), ev.rows) } satisfies MonthData, { headers: ok && ev.ok ? privateCache : noStore });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
