import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => { process.env.ENCRYPTION_KEY = "not-a-valid-key"; });
vi.mock("@neondatabase/serverless", () => ({
  neon: () => Object.assign(
    () => Promise.resolve([{ date: "2026-10-14", text: "enc:v1:aaaa.bbbb.cccc" }]),
    { transaction: async () => [] },
  ),
}));

import { search } from "@/lib/db";

describe("search.candidates with a broken ENCRYPTION_KEY", () => {
  it("rethrows the configuration error instead of skipping every row", async () => {
    await expect(search.candidates("me")).rejects.toThrow(/ENCRYPTION_KEY/);
  });
});
