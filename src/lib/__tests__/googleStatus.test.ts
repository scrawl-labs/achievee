import { describe, expect, it } from "vitest";
import { DICT, LOCALES } from "@/lib/i18n";
import { googleCardModel, googleStatusOf, parseGoogleReturn, returnMessageKey, stripGoogleReturn } from "@/lib/googleStatus";

describe("googleStatusOf", () => {
  it("reads the google entry from the integrations list", () => {
    expect(googleStatusOf([{ provider: "github", label: "@a" }, { provider: "google", status: "revoked" }])).toBe("revoked");
    expect(googleStatusOf([{ provider: "google", status: "connected" }])).toBe("connected");
    expect(googleStatusOf([{ provider: "google", status: "none" }])).toBe("none");
  });
  it("returns null while loading or for an unexpected shape (never guesses a state)", () => {
    expect(googleStatusOf(null)).toBeNull();
    expect(googleStatusOf([])).toBeNull();
    expect(googleStatusOf([{ provider: "google", status: "weird" }])).toBeNull();
    expect(googleStatusOf([{ provider: "google" }])).toBeNull();
    expect(googleStatusOf({ provider: "google", status: "none" })).toBeNull();
  });
});

describe("googleCardModel", () => {
  it("none -> connect, nothing to disconnect", () => {
    expect(googleCardModel("none")).toEqual({ state: "none", action: "connect", canDisconnect: false });
  });
  it("connected -> disconnect only", () => {
    expect(googleCardModel("connected")).toEqual({ state: "connected", action: null, canDisconnect: true });
  });
  it("revoked -> reconnect, and the stale link can be removed too", () => {
    expect(googleCardModel("revoked")).toEqual({ state: "revoked", action: "reconnect", canDisconnect: true });
  });
  it("unknown (loading) -> no actions", () => {
    expect(googleCardModel(null)).toEqual({ state: "loading", action: null, canDisconnect: false });
  });
});

describe("parseGoogleReturn", () => {
  it("accepts the three results on the integrations tab", () => {
    for (const r of ["connected", "error", "partial"] as const) {
      expect(parseGoogleReturn(`?tab=integrations&google=${r}`)).toEqual({ tab: "integrations", result: r });
    }
  });
  it("works without the leading ? and with other params around", () => {
    expect(parseGoogleReturn("google=partial&tab=integrations&x=1")).toEqual({ tab: "integrations", result: "partial" });
  });
  it("ignores anything else", () => {
    expect(parseGoogleReturn("")).toBeNull();
    expect(parseGoogleReturn("?tab=integrations")).toBeNull();
    expect(parseGoogleReturn("?google=connected")).toBeNull();
    expect(parseGoogleReturn("?tab=calendar&google=connected")).toBeNull();
    expect(parseGoogleReturn("?tab=integrations&google=<script>")).toBeNull();
    expect(parseGoogleReturn("?tab=integrations&google=connected&google=error")).toEqual({ tab: "integrations", result: "connected" });
  });
});

describe("stripGoogleReturn", () => {
  it("removes tab and google, keeps the rest", () => {
    expect(stripGoogleReturn("?tab=integrations&google=connected")).toBe("");
    expect(stripGoogleReturn("?a=1&tab=integrations&google=error&b=2")).toBe("?a=1&b=2");
  });
});

describe("copy", () => {
  it("every result has a fixed message key in every locale", () => {
    for (const r of ["connected", "error", "partial"] as const) {
      for (const l of LOCALES) expect(DICT[l][returnMessageKey(r)], `${l}:${r}`).toBeTruthy();
    }
  });
  it("every gc.* key exists in every locale (zh is cast, so the type cannot catch it)", () => {
    const keys = Object.keys(DICT.en).filter((k) => k.startsWith("gc."));
    expect(keys.length).toBeGreaterThan(5);
    for (const l of LOCALES) for (const k of keys) expect((DICT[l] as Record<string, string>)[k], `${l}:${k}`).toBeTruthy();
  });
});
