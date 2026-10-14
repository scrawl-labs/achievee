import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/searchRateLimit";

describe("createRateLimiter", () => {
  it("allows the first call and blocks a repeat within the interval", () => {
    const l = createRateLimiter({ minIntervalMs: 300, maxEntries: 10 });
    expect(l.allow("a", 1000)).toBe(true);
    expect(l.allow("a", 1299)).toBe(false);
    expect(l.allow("a", 1300)).toBe(true);
  });
  it("a blocked call does not extend the window", () => {
    const l = createRateLimiter({ minIntervalMs: 300, maxEntries: 10 });
    l.allow("a", 0);
    l.allow("a", 200);
    expect(l.allow("a", 300)).toBe(true);
  });
  it("tracks users independently", () => {
    const l = createRateLimiter({ minIntervalMs: 300, maxEntries: 10 });
    expect(l.allow("a", 0)).toBe(true);
    expect(l.allow("b", 1)).toBe(true);
    expect(l.allow("a", 2)).toBe(false);
  });
  it("never grows beyond maxEntries (evicts stale first, then oldest)", () => {
    const l = createRateLimiter({ minIntervalMs: 300, maxEntries: 3 });
    for (let i = 0; i < 100; i++) l.allow(`u${i}`, i * 10);
    expect(l.size()).toBeLessThanOrEqual(3);
    for (let i = 0; i < 100; i++) l.allow(`v${i}`, 100_000 + i);
    expect(l.size()).toBeLessThanOrEqual(3);
  });
  it("drops expired entries when full so live ones are kept", () => {
    const l = createRateLimiter({ minIntervalMs: 300, maxEntries: 2 });
    l.allow("old", 0);
    l.allow("live", 1000);
    l.allow("new", 1100);
    expect(l.allow("live", 1101)).toBe(false);
  });
});
