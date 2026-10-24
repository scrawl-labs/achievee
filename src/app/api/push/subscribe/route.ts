import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { pushSubs } from "@/lib/db";
import { bad, unauthorized } from "@/lib/api";
import { REMINDER_TEXT } from "@/lib/reminder";

export const dynamic = "force-dynamic";

const isHttps = (s: unknown): s is string => {
  if (typeof s !== "string" || s.length > 1000) return false;
  try { return new URL(s).protocol === "https:"; } catch { return false; }
};
const isKey = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9_-]{8,200}$/.test(s);
const validZone = (z: unknown): z is string => {
  if (typeof z !== "string" || z.length > 64) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: z }); return true; } catch { return false; }
};

/** Turn the 9 pm reminder on for this device: { subscription: PushSubscriptionJSON, tz, locale }. */
export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const { subscription, tz, locale } = await req.json().catch(() => ({}));
  const keys = subscription?.keys;
  if (!isHttps(subscription?.endpoint) || !isKey(keys?.p256dh) || !isKey(keys?.auth) || !validZone(tz) || !(typeof locale === "string" && locale in REMINDER_TEXT)) return bad("bad input");
  await pushSubs.add(u.id, { endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth }, tz, locale);
  return NextResponse.json({ ok: true });
}

/** Turn it off for this device: { endpoint }. */
export async function DELETE(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const { endpoint } = await req.json().catch(() => ({}));
  if (!isHttps(endpoint)) return bad("bad input");
  await pushSubs.remove(u.id, endpoint);
  return NextResponse.json({ ok: true });
}
