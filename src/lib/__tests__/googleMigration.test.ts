import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ integrations: { get: vi.fn(), save: vi.fn() }, identity: { ensure: vi.fn() } }));

import { createGoogleMigrator, hasGoogleScopes, raceTimeout, shouldStoreGoogle } from "@/lib/googleMigration";
import type { GoogleConn, GoogleStore } from "@/lib/googleToken";

const SCOPE = "openid email profile https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/tasks.readonly";
const conn = (status: GoogleConn["status"]): GoogleConn => ({ refresh_token: "OLD", scope: SCOPE, connected_at: "x", status });

describe("hasGoogleScopes", () => {
  it("needs both calendar and tasks", () => {
    expect(hasGoogleScopes(SCOPE)).toBe(true);
    expect(hasGoogleScopes("openid email")).toBe(false);
    expect(hasGoogleScopes("https://www.googleapis.com/auth/tasks.readonly")).toBe(false);
    expect(hasGoogleScopes(undefined)).toBe(false);
    expect(hasGoogleScopes(42)).toBe(false);
  });
});

describe("shouldStoreGoogle", () => {
  const jwt = { refreshToken: "RT", scope: SCOPE };
  it("stores when nothing is in the db", () => expect(shouldStoreGoogle({ db: null, ...jwt, freshLogin: false })).toBe(true));
  it("a real sign-in always replaces the row, whatever its state", () => {
    expect(shouldStoreGoogle({ db: conn("connected"), ...jwt, freshLogin: true })).toBe(true);
    expect(shouldStoreGoogle({ db: conn("revoked"), ...jwt, freshLogin: true })).toBe(true);
    expect(shouldStoreGoogle({ db: null, ...jwt, freshLogin: true })).toBe(true);
  });
  it("a sign-in response without a refresh token never overwrites", () => {
    expect(shouldStoreGoogle({ db: conn("connected"), refreshToken: undefined, scope: SCOPE, freshLogin: true })).toBe(false);
    expect(shouldStoreGoogle({ db: conn("revoked"), refreshToken: "", scope: SCOPE, freshLogin: true })).toBe(false);
  });
  it("outside a sign-in only a missing row is filled; connected and revoked rows stay", () => {
    expect(shouldStoreGoogle({ db: conn("connected"), ...jwt, freshLogin: false })).toBe(false);
    expect(shouldStoreGoogle({ db: conn("revoked"), ...jwt, freshLogin: false })).toBe(false);
  });
  it("needs a refresh token and the scopes", () => {
    expect(shouldStoreGoogle({ db: null, refreshToken: undefined, scope: SCOPE, freshLogin: true })).toBe(false);
    expect(shouldStoreGoogle({ db: null, refreshToken: "", scope: SCOPE, freshLogin: true })).toBe(false);
    expect(shouldStoreGoogle({ db: null, refreshToken: "RT", scope: "openid", freshLogin: true })).toBe(false);
    expect(shouldStoreGoogle({ db: null, refreshToken: "RT", scope: undefined, freshLogin: true })).toBe(false);
  });
});

describe("createGoogleMigrator", () => {
  let current: GoogleConn | null;
  let store: GoogleStore;
  let warn: ReturnType<typeof vi.fn>;
  const clock = { t: 0 };
  const make = () => createGoogleMigrator({ store, now: () => clock.t, warn: warn as unknown as () => void });

  beforeEach(() => {
    current = null; clock.t = 1_000_000; warn = vi.fn();
    store = {
      get: vi.fn(async () => current),
      save: vi.fn(async (_u: string, c: GoogleConn) => { current = c; }),
    };
  });

  it("saves a connected row from the jwt once, then stops checking the db", async () => {
    const m = make();
    await m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false);
    expect(store.save).toHaveBeenCalledWith("me", expect.objectContaining({ refresh_token: "RT", scope: SCOPE, status: "connected" }));
    await m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false);
    expect(store.get).toHaveBeenCalledTimes(1);
  });

  it("skips the db entirely when the jwt has no usable token", async () => {
    await make().migrate("me", { refreshToken: undefined, scope: SCOPE }, false);
    expect(store.get).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing connected row", async () => {
    current = conn("connected");
    await make().migrate("me", { refreshToken: "RT", scope: SCOPE }, false);
    expect(store.save).not.toHaveBeenCalled();
  });

  it("a fresh login replaces a connected row with the new token", async () => {
    current = conn("connected");
    await make().migrate("me", { refreshToken: "NEW", scope: SCOPE }, true);
    expect(current?.refresh_token).toBe("NEW");
  });

  it("a fresh login replaces a revoked row even if an earlier lazy check was memoised", async () => {
    current = conn("revoked");
    const m = make();
    await m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false);
    expect(store.save).not.toHaveBeenCalled();
    await m.migrate("me", { refreshToken: "NEW", scope: SCOPE }, true);
    expect(current?.refresh_token).toBe("NEW");
    expect(current?.status).toBe("connected");
  });

  it("swallows store failures, warns without details, and backs off for a minute", async () => {
    store.get = vi.fn(async () => { throw new Error("db down RT secret"); });
    const m = make();
    await expect(m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toEqual([]);
    await m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false);
    expect(store.get).toHaveBeenCalledTimes(1);
    clock.t += 61_000;
    await m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false);
    expect(store.get).toHaveBeenCalledTimes(2);
  });

  describe("timeout", () => {
    it("gives up on a hanging db after timeoutMs, skips the migration and backs off", async () => {
      vi.useFakeTimers();
      try {
        store.get = vi.fn(() => new Promise<GoogleConn | null>(() => {}));
        const m = createGoogleMigrator({ store, now: () => clock.t, warn: warn as unknown as () => void, timeoutMs: 1500 });
        const p = m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false);
        await vi.advanceTimersByTimeAsync(1500);
        await expect(p).resolves.toBeUndefined();
        await m.migrate("me", { refreshToken: "RT", scope: SCOPE }, false); // inside the back-off window
        expect(store.get).toHaveBeenCalledTimes(1);
      } finally { vi.useRealTimers(); }
    });
  });
});

describe("raceTimeout", () => {
  it("true when the work finishes first, false on timeout, and never rejects", async () => {
    expect(await raceTimeout(Promise.resolve(1), 50)).toBe(true);
    expect(await raceTimeout(Promise.reject(new Error("x")), 50)).toBe(true);
    expect(await raceTimeout(new Promise(() => {}), 10)).toBe(false);
  });
});
