import { describe, expect, it } from "vitest";
import { CURRENCIES, defaultCurrency, isCurrency, makeFormat } from "../i18n";

describe("currency", () => {
  it("follows the language until one is chosen", () => {
    expect(defaultCurrency("ko")).toBe("KRW");
    expect(defaultCurrency("en")).toBe("USD");
    expect(makeFormat("ko").money(3000000)).toContain("₩");
  });
  it("keeps the chosen symbol whatever the language, and never converts the number", () => {
    for (const locale of ["ko", "en", "ja", "es", "zh"] as const) {
      const text = makeFormat(locale, "KRW").money(3000000);
      expect(text.replace(/[.,s00a0]/g, "")).toContain("3000000");
      expect(text.includes("₩") || text.includes("KRW")).toBe(true);
    }
    expect(makeFormat("ko", "USD").money(1234)).toContain("$");
    expect(makeFormat("en", "JPY").money(1234)).toMatch(/¥|JPY/);
  });
  it("accepts only the listed codes", () => {
    expect(CURRENCIES.every(isCurrency)).toBe(true);
    expect(isCurrency("BTC")).toBe(false);
    expect(isCurrency(undefined)).toBe(false);
  });
});
