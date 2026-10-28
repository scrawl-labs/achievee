import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dueDate, localDateHour, REMINDER_TEXT } from "../reminder";

describe("localDateHour", () => {
  it("reads the clock in the person's own time zone", () => {
    const at = new Date("2026-10-24T12:30:00Z");
    expect(localDateHour(at, "Asia/Seoul")).toEqual({ date: "2026-10-24", hour: 21 });
    expect(localDateHour(at, "America/Los_Angeles")).toEqual({ date: "2026-10-24", hour: 5 });
    expect(localDateHour(new Date("2026-10-24T16:00:00Z"), "Asia/Seoul")).toEqual({ date: "2026-10-25", hour: 1 });
  });
  it("falls back to UTC for a zone it does not know", () => {
    expect(localDateHour(new Date("2026-10-24T12:30:00Z"), "Mars/Base")).toEqual({ date: "2026-10-24", hour: 12 });
  });
});

describe("dueDate", () => {
  const sub = (lastSent = "") => ({ tz: "Asia/Seoul", lastSent });
  it("is due in the 21:xx hour, once per local date", () => {
    expect(dueDate(sub(), new Date("2026-10-24T12:05:00Z"))).toBe("2026-10-24");
    expect(dueDate(sub("2026-10-24"), new Date("2026-10-24T12:50:00Z"))).toBeNull();
    expect(dueDate(sub("2026-10-23"), new Date("2026-10-24T12:50:00Z"))).toBe("2026-10-24");
  });
  it("is not due at other hours", () => {
    expect(dueDate(sub(), new Date("2026-10-24T11:59:00Z"))).toBeNull();
    expect(dueDate(sub(), new Date("2026-10-24T13:00:00Z"))).toBeNull();
  });
  it("has a message for every language", () => {
    for (const l of ["ko", "en", "ja", "es", "zh"] as const) expect(REMINDER_TEXT[l].title && REMINDER_TEXT[l].body).toBeTruthy();
  });
});

const { getUser, add, remove, all, markSent, drop, count, hasEmotions, send } = vi.hoisted(() => ({
  getUser: vi.fn(), add: vi.fn(), remove: vi.fn(), all: vi.fn(), markSent: vi.fn(), drop: vi.fn(), count: vi.fn(), hasEmotions: vi.fn(), send: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/db", () => ({ pushSubs: { add, remove, all, markSent, drop, count }, diary: { hasEmotions } }));
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: send } }));

import { GET } from "@/app/api/cron/reminders/route";
import { DELETE, POST } from "@/app/api/push/subscribe/route";

const sub = { endpoint: "https://push.example/abc", keys: { p256dh: "BPublicKey12345", auth: "authSecret1234" } };
const post = (body: unknown) => POST(new Request("http://x/api/push/subscribe", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me" });
  count.mockResolvedValue(1);
  process.env.CRON_SECRET = "s3cret"; process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub"; process.env.VAPID_PRIVATE_KEY = "priv"; process.env.VAPID_SUBJECT = "mailto:a@b.c";
});

describe("POST/DELETE /api/push/subscribe", () => {
  it("stores a valid subscription with the zone and language", async () => {
    expect((await post({ subscription: sub, tz: "Asia/Seoul", locale: "ko" })).status).toBe(200);
    expect(add).toHaveBeenCalledWith("me", { endpoint: sub.endpoint, p256dh: "BPublicKey12345", auth: "authSecret1234" }, "Asia/Seoul", "ko");
  });
  it.each([
    ["a non-https endpoint", { subscription: { ...sub, endpoint: "http://x/y" }, tz: "Asia/Seoul", locale: "ko" }],
    ["missing keys", { subscription: { endpoint: sub.endpoint }, tz: "Asia/Seoul", locale: "ko" }],
    ["a bad zone", { subscription: sub, tz: "Mars/Base", locale: "ko" }],
    ["an unknown language", { subscription: sub, tz: "Asia/Seoul", locale: "xx" }],
  ])("rejects %s before storing", async (_n, body) => {
    expect((await post(body)).status).toBe(400);
    expect(add).not.toHaveBeenCalled();
  });
  it("needs a signed-in user, and DELETE removes only the caller's subscription", async () => {
    getUser.mockResolvedValue(null);
    expect((await post({ subscription: sub, tz: "Asia/Seoul", locale: "ko" })).status).toBe(401);
    getUser.mockResolvedValue({ id: "me" });
    expect((await DELETE(new Request("http://x", { method: "DELETE", body: JSON.stringify({ endpoint: sub.endpoint }) }))).status).toBe(200);
    expect(remove).toHaveBeenCalledWith("me", sub.endpoint);
  });
});

describe("GET /api/cron/reminders", () => {
  const call = (token?: string) => GET(new Request("http://x/api/cron/reminders", { headers: token ? { authorization: `Bearer ${token}` } : {} }));
  const row = (over = {}) => ({ endpoint: sub.endpoint, user: "me", p256dh: "k", auth: "a", tz: "UTC", locale: "ko", lastSent: "", ...over });
  const at21 = () => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-24T21:10:00Z")); };
  afterEach(() => vi.useRealTimers());

  it("refuses a call without the secret and does nothing", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("wrong")).status).toBe(401);
    expect(all).not.toHaveBeenCalled();
  });
  it("sends the nudge to a device at 21:xx that has no emotion word yet, then remembers the date", async () => {
    at21(); all.mockResolvedValue([row()]); hasEmotions.mockResolvedValue(false); send.mockResolvedValue({});
    expect(await (await call("s3cret")).json()).toMatchObject({ sent: 1, skipped: 0, dropped: 0, devices: 1, due: 1 });
    expect(JSON.parse(send.mock.calls[0][1])).toMatchObject({ title: REMINDER_TEXT.ko.title, url: "/?open=diary" });
    expect(markSent).toHaveBeenCalledWith(sub.endpoint, "2026-10-24");
  });
  it("skips someone who already picked a word today, and anyone who is not at 21:xx", async () => {
    at21(); all.mockResolvedValue([row(), row({ endpoint: "https://push.example/other", tz: "Asia/Seoul" })]); hasEmotions.mockResolvedValue(true);
    expect(await (await call("s3cret")).json()).toMatchObject({ sent: 0, skipped: 1, dropped: 0, devices: 2, due: 1 });
    expect(send).not.toHaveBeenCalled();
  });
  it("drops a subscription the browser says is gone", async () => {
    at21(); all.mockResolvedValue([row()]); hasEmotions.mockResolvedValue(false); send.mockRejectedValue({ statusCode: 410 });
    expect(await (await call("s3cret")).json()).toMatchObject({ sent: 0, skipped: 0, dropped: 1, devices: 1, due: 1 });
    expect(drop).toHaveBeenCalledWith(sub.endpoint);
  });
});
