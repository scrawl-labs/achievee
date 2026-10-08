import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { fetchRange } from "@/lib/google";
import { demoRange } from "@/lib/demo";

export const dynamic = "force-dynamic";
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "", to = p.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to <= from) return NextResponse.json({ error: "bad range" }, { status: 400 });
  const u = await getUser();
  try {
    return NextResponse.json(u.demo ? demoRange(from, to) : await fetchRange(from, to, u.accessToken!));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
