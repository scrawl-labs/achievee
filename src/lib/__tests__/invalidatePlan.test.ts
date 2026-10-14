import { describe, expect, it } from "vitest";
import { planInvalidation } from "@/lib/invalidatePlan";

describe("planInvalidation", () => {
  it("reloads each mounted URL once even when several hooks watch it", () => {
    const p = planInvalidation("/api/month", ["/api/month?ym=2026-10", "/api/month?ym=2026-10", "/api/month?ym=2026-11"], []);
    expect(p.reload).toEqual(["/api/month?ym=2026-10", "/api/month?ym=2026-11"]);
    expect(p.drop).toEqual([]);
  });

  it("only touches URLs with the prefix", () => {
    const p = planInvalidation("/api/todos", ["/api/month?ym=1", "/api/todos?from=a&to=b"], ["/api/month?ym=1", "/api/events?x"]);
    expect(p.reload).toEqual(["/api/todos?from=a&to=b"]);
    expect(p.drop).toEqual([]);
  });

  it("drops cached URLs nobody has mounted, keeps (reloads) the mounted ones", () => {
    const p = planInvalidation("/api/month", ["/api/month?ym=2026-10"], ["/api/month?ym=2026-10", "/api/month?ym=2026-09", "/api/diary"]);
    expect(p.reload).toEqual(["/api/month?ym=2026-10"]);
    expect(p.drop).toEqual(["/api/month?ym=2026-09"]);
  });

  it("a mounted URL that is not cached yet is still reloaded", () => {
    expect(planInvalidation("/api/todos", ["/api/todos?a"], []).reload).toEqual(["/api/todos?a"]);
  });

  it("skipped URLs are neither reloaded nor dropped (the caller already refreshed them)", () => {
    const p = planInvalidation("/api/todos", ["/api/todos?own", "/api/todos?other"], ["/api/todos?own", "/api/todos?other", "/api/todos?old"], ["/api/todos?own"]);
    expect(p.reload).toEqual(["/api/todos?other"]);
    expect(p.drop).toEqual(["/api/todos?old"]);
  });

  it("nothing mounted, nothing cached", () => expect(planInvalidation("/api/x", [], [])).toEqual({ reload: [], drop: [] }));
});
