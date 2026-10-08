import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { fetchDay } from "@/lib/google";
import { demoDay } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "bad date" }, { status: 400 });
  const u = await getUser();
  try {
    return NextResponse.json(u.demo ? demoDay(date) : await fetchDay(date, u.accessToken!));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
