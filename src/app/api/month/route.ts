import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { fetchMonth } from "@/lib/google";
import { demoMonth } from "@/lib/demo";
import type { MonthData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ym = new URL(req.url).searchParams.get("ym") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(ym)) return NextResponse.json({ error: "bad ym" }, { status: 400 });
  const u = await getUser();
  try {
    const days = u.demo ? demoMonth(ym) : await fetchMonth(ym, u.accessToken!);
    return NextResponse.json({ ym, days, demo: u.demo } satisfies MonthData);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
