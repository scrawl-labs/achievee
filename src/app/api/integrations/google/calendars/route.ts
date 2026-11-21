import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api";
import { fetchCalendars } from "@/lib/google";
import { resolveGoogleAccess } from "@/lib/googleToken";
import { hiddenCalendarsOf } from "@/lib/hiddenCalendars";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" }; // the list changes with what is checked in Google Calendar

/**
 * The Google calendars Achievee reads (the ones checked in Google Calendar's sidebar) and which of them the person hid here.
 * Needs no extra scope: calendarList is already read for every events request. Not connected: an empty list with the status.
 */
export async function GET() {
  const u = await getUser();
  if (!u) return unauthorized();
  const hidden = hiddenCalendarsOf(u.id, "calendars");
  try {
    const access = await resolveGoogleAccess(u);
    if (access.status !== "ok") return NextResponse.json({ status: access.status, calendars: [], hidden: await hidden }, { headers: noStore });
    const calendars = await fetchCalendars(access.accessToken);
    return NextResponse.json({ status: "ok", calendars, hidden: await hidden }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 }); // fixed text
  }
}
