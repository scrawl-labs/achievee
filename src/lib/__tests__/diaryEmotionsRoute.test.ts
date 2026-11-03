import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORDS, mergeEmotionIds } from "@/lib/emotions";

const { getUser, day, upsert } = vi.hoisted(() => ({ getUser: vi.fn(), day: vi.fn(), upsert: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getUser }));
vi.mock("@/lib/db", () => ({ diary: { day, upsert } }));

import { POST } from "@/app/api/diary/emotions/route";

const [a, b, c, d] = WORDS.slice(0, 4).map((w) => w.id);
const call = (body: unknown) => POST(new Request("http://x/api/diary/emotions", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ id: "me" });
  day.mockResolvedValue(null);
});

describe("mergeEmotionIds", () => {
  it("keeps the day's words first, fills free places and reports what did not fit", () => {
    expect(mergeEmotionIds([a, b], [b, c, d])).toEqual({ ids: [a, b, c], added: [c], left: [d] });
    expect(mergeEmotionIds([], [a])).toEqual({ ids: [a], added: [a], left: [] });
  });
});

describe("POST /api/diary/emotions", () => {
  it("asks guests to sign in", async () => {
    getUser.mockResolvedValue(null);
    expect((await call({ date: "2026-11-03", emotions: [a] })).status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects a bad date or no known words", async () => {
    expect((await call({ date: "nope", emotions: [a] })).status).toBe(400);
    expect((await call({ date: "2026-11-03", emotions: ["not-a-word"] })).status).toBe(400);
    expect((await call({ date: "2026-11-03", emotions: [], note: "   " })).status).toBe(400);
  });

  it("starts a new day with the words and an empty body", async () => {
    const res = await call({ date: "2026-11-03", emotions: [a, b] });
    expect(await res.json()).toMatchObject({ added: [a, b], left: [], emotions: [a, b] });
    expect(upsert).toHaveBeenCalledWith("me", "2026-11-03", expect.anything(), "", [a, b]);
  });

  it("adds to a day that already has writing without touching the text", async () => {
    day.mockResolvedValue({ date: "2026-11-03", mood: "3", body: "오늘은 길었다", emotions: [a] });
    await call({ date: "2026-11-03", emotions: [b] });
    expect(upsert).toHaveBeenCalledWith("me", "2026-11-03", expect.anything(), "오늘은 길었다", [a, b]);
  });

  it("adds a note after what is already written, never replacing it", async () => {
    day.mockResolvedValue({ date: "2026-11-03", mood: "3", body: "아침엔 바빴다", emotions: [a] });
    const j = await (await call({ date: "2026-11-03", emotions: [b], note: "  저녁엔 바다를 봤다  " })).json();
    expect(j).toMatchObject({ added: [b], noted: true });
    expect(upsert).toHaveBeenCalledWith("me", "2026-11-03", expect.anything(), "아침엔 바빴다\n\n저녁엔 바다를 봤다", [a, b]);
  });

  it("saves a note on its own, even when the words did not fit", async () => {
    day.mockResolvedValue({ date: "2026-11-03", mood: "3", body: "", emotions: [a, b, c] });
    await call({ date: "2026-11-03", emotions: [d], note: "그냥 그런 날" });
    expect(upsert).toHaveBeenCalledWith("me", "2026-11-03", expect.anything(), "그냥 그런 날", [a, b, c]);
  });

  it("changes nothing when the day is already full", async () => {
    day.mockResolvedValue({ date: "2026-11-03", mood: "3", body: "x", emotions: [a, b, c] });
    const j = await (await call({ date: "2026-11-03", emotions: [d] })).json();
    expect(j).toMatchObject({ added: [], left: [d] });
    expect(upsert).not.toHaveBeenCalled();
  });
});
