import { describe, expect, it } from "vitest";
import { createFreshSet } from "@/lib/freshSet";

describe("createFreshSet", () => {
  it("take is true once per marked url, then false (use it, lose it)", () => {
    const s = createFreshSet(10);
    s.mark("/api/month?ym=2026-10");
    expect(s.take("/api/month?ym=2026-10")).toBe(true);
    expect(s.take("/api/month?ym=2026-10")).toBe(false);
  });
  it("unmarked urls are never fresh", () => expect(createFreshSet(10).take("/x")).toBe(false));
  it("marking twice still needs one take", () => {
    const s = createFreshSet(10);
    s.mark("/a"); s.mark("/a");
    expect(s.take("/a")).toBe(true);
    expect(s.take("/a")).toBe(false);
  });
  it("is bounded: the oldest mark is dropped first", () => {
    const s = createFreshSet(2);
    s.mark("/a"); s.mark("/b"); s.mark("/c");
    expect(s.size()).toBe(2);
    expect(s.take("/a")).toBe(false);
    expect(s.take("/b")).toBe(true);
    expect(s.take("/c")).toBe(true);
  });
  it("re-marking refreshes its age", () => {
    const s = createFreshSet(2);
    s.mark("/a"); s.mark("/b"); s.mark("/a"); s.mark("/c");
    expect(s.take("/a")).toBe(true);
    expect(s.take("/b")).toBe(false);
  });
});
