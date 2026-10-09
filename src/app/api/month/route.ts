import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { fetchMonth } from "@/lib/google";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { safeTz } from "@/lib/tz";
import type { MonthData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const ym = p.get("ym") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return bad("bad ym");
  const u = await getUser();
  if (!u) return unauthorized();
  try {
    const days = await fetchMonth(ym, u.accessToken, safeTz(p.get("tz")));
    return NextResponse.json({ ym, days } satisfies MonthData, { headers: privateCache });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
