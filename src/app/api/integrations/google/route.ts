import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api";
import { disconnectGoogle } from "@/lib/googleToken";

export const dynamic = "force-dynamic";

/** Disconnect Google Calendar: revoke at Google (best effort), delete the stored connection. Sign-in is unaffected. */
export async function DELETE() {
  const u = await getUser();
  if (!u) return unauthorized();
  try {
    await disconnectGoogle(u.id);
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 }); // fixed text
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}
