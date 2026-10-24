import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { diary, pushSubs } from "@/lib/db";
import { REMINDER_TEXT, dueDate } from "@/lib/reminder";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const authorised = (req: Request) => {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Called once an hour by the scheduler (.github/workflows/reminder.yml) with `Authorization: Bearer $CRON_SECRET`.
 * For every device whose local clock says 21:xx and that has not been reminded today, sends "how did today feel?",
 * unless the day already has an emotion word. The message holds no personal data.
 */
export async function GET(req: Request) {
  if (!authorised(req)) return new NextResponse("unauthorized", { status: 401 });
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  if (!pub || !priv || !subject) return NextResponse.json({ error: "push is not configured" }, { status: 503 });
  webpush.setVapidDetails(subject, pub, priv);

  const now = new Date();
  let sent = 0, skipped = 0, dropped = 0;
  for (const sub of await pushSubs.all()) {
    const date = dueDate(sub, now);
    if (!date) continue;
    if (await diary.hasEmotions(sub.user, date)) { await pushSubs.markSent(sub.endpoint, date); skipped++; continue; }
    const text = REMINDER_TEXT[(sub.locale in REMINDER_TEXT ? sub.locale : "en") as Locale];
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: text.title, body: text.body, url: "/?open=diary" }), { TTL: 3 * 3600 });
      await pushSubs.markSent(sub.endpoint, date);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { await pushSubs.drop(sub.endpoint); dropped++; }
    }
  }
  return NextResponse.json({ sent, skipped, dropped });
}
