import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { fetchRange } from "@/lib/google";
import { resolveGoogleAccess } from "@/lib/googleToken";
import { bad, privateCache, unauthorized } from "@/lib/api";
import { safeTz } from "@/lib/tz";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" }; // a revoked answer must not be replayed after the user reconnects
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const from = p.get("from") ?? "", to = p.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || to <= from) return bad("bad range");
  const u = await getUser();
  if (!u) return unauthorized();
  try {
    const access = await resolveGoogleAccess(u);
    // The body is a bare array, so the revoked flag travels as a header instead of an extra field.
    if (access.status === "revoked") return NextResponse.json([], { headers: { ...noStore, "X-Google-Status": "revoked" } });
    return NextResponse.json(await fetchRange(from, to, access.accessToken, safeTz(p.get("tz"))), { headers: privateCache });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
