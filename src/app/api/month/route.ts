import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { emptyMonthDays, fetchMonth } from "@/lib/google";
import { resolveGoogleAccess } from "@/lib/googleToken";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { safeTz } from "@/lib/tz";
import type { MonthData } from "@/lib/types";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" }; // a revoked answer must not be replayed after the user reconnects

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const ym = p.get("ym") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return bad("bad ym");
  const u = await getUser();
  if (!u) return unauthorized();
  try {
    const access = await resolveGoogleAccess(u);
    if (access.status === "revoked") return NextResponse.json({ ym, days: emptyMonthDays(ym), google: "revoked" } satisfies MonthData, { headers: noStore });
    const days = await fetchMonth(ym, access.accessToken, safeTz(p.get("tz")));
    return NextResponse.json({ ym, days } satisfies MonthData, { headers: privateCache });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
