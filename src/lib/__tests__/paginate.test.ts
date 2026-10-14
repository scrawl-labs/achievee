import { describe, expect, it } from "vitest";
import { fetchAllPages } from "@/lib/paginate";

describe("fetchAllPages", () => {
  it("concatenates items across pages and passes the page token", async () => {
    const seen: (string | undefined)[] = [];
    const pages: Record<string, { items?: number[]; nextPageToken?: string }> = {
      first: { items: [1, 2], nextPageToken: "a" }, a: { items: [3], nextPageToken: "b" }, b: {},
    };
    const out = await fetchAllPages<number>(async (t) => { seen.push(t); return pages[t ?? "first"]; });
    expect(out).toEqual([1, 2, 3]);
    expect(seen).toEqual([undefined, "a", "b"]);
  });

  it("stops on a repeated token instead of looping forever", async () => {
    const out = await fetchAllPages<number>(async () => ({ items: [1], nextPageToken: "same" }));
    expect(out.length).toBeLessThanOrEqual(2);
  });
});
