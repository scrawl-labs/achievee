import { beforeEach, describe, expect, it, vi } from "vitest";

const { calls, nextRows } = vi.hoisted(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  return { calls: [] as { text: string; params: unknown[] }[], nextRows: { v: [] as unknown[] } };
});
vi.mock("@neondatabase/serverless", () => ({
  neon: () => Object.assign(
    (strings: TemplateStringsArray, ...params: unknown[]) => {
      calls.push({ text: strings.join("?"), params });
      return Promise.resolve(nextRows.v);
    },
    { transaction: async () => [] },
  ),
}));

import { deleteUserData, goals } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { GOAL_HARD_LIMIT } from "@/lib/goals";

const last = () => calls[calls.length - 1];
beforeEach(() => { calls.length = 0; nextRows.v = []; });

describe("goals db layer", () => {
  it("stores text encrypted and returns it decrypted", async () => {
    nextRows.v = [{ id: 1, scope: "day", period_start: "2026-10-14", text: encrypt("plain goal"), done: false, position: 0 }];
    const row = await goals.add("me", { scope: "day", period_start: "2026-10-14", text: "plain goal" });
    const sent = last().params.find((p) => typeof p === "string" && p.startsWith("enc:v1:"));
    expect(sent).toBeDefined();
    expect(last().params).not.toContain("plain goal");
    expect(row?.text).toBe("plain goal");
    expect(last().params).toContain(GOAL_HARD_LIMIT);
  });
  it("add returns null when the limit blocks the insert", async () => {
    expect(await goals.add("me", { scope: "day", period_start: "2026-10-14", text: "x" })).toBeNull();
  });
  it("update and remove always filter by id AND user", async () => {
    await goals.update("me", { id: 5, done: true });
    expect(last().text).toMatch(/WHERE id=\? AND "user"=\?/);
    expect(last().params).toEqual(expect.arrayContaining([5, "me"]));
    await goals.remove("me", 5);
    expect(last().text).toMatch(/WHERE id=\? AND "user"=\?/);
    expect(last().params).toEqual([5, "me"]);
  });
  it("update encrypts new text and reports a miss as null", async () => {
    expect(await goals.update("me", { id: 5, text: "new" })).toBeNull();
    expect(last().params.some((p) => typeof p === "string" && p.startsWith("enc:v1:"))).toBe(true);
  });
  it("account deletion includes the goal table", async () => {
    await deleteUserData("me");
    expect(calls.some((c) => c.text.includes("DELETE FROM goal WHERE"))).toBe(true);
  });
});
