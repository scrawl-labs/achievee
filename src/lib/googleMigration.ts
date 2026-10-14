import { dbGoogleStore, type GoogleConn, type GoogleStore } from "./googleToken";

// Lazy move of the refresh token from the session JWT into the DB. It must never break sign-in or a request.

const RETRY_AFTER_FAILURE_MS = 60_000;

export const hasGoogleScopes = (scope: unknown): boolean =>
  typeof scope === "string" && scope.includes("/auth/calendar") && scope.includes("/auth/tasks");

export function shouldStoreGoogle(i: { db: GoogleConn | null; refreshToken: unknown; scope: unknown; freshLogin: boolean }): boolean {
  if (typeof i.refreshToken !== "string" || !i.refreshToken || !hasGoogleScopes(i.scope)) return false;
  // A real sign-in always carries the newest grant, so it replaces whatever is stored (connected, revoked or missing).
  // A mid-session JWT may still hold an old or just-revoked token, so outside a sign-in only a missing row is filled.
  return i.freshLogin || !i.db;
}

/** Resolves true when `work` settled within `ms`, false on timeout. Never rejects: callers only care that they are not kept waiting. */
export async function raceTimeout(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), ms); });
  try { return await Promise.race([work.then(() => true, () => true), timeout]); } finally { clearTimeout(timer); }
}

/** True only if `work` resolved (did not reject) within `ms`. */
export async function succeedsWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let ok = false;
  await raceTimeout(work.then(() => { ok = true; }), ms);
  return ok;
}

export const MIGRATION_TIMEOUT_MS = 1_500;

/** The single place where a Google problem is reported. Fixed text only: errors and env values may carry tokens or user ids. */
const warnGoogle = (text: string): void => console.warn(`[google] ${text}`);

export function warnGoogleStoreFailed(): void {
  warnGoogle("could not store the Google connection; the session token is used instead");
}

export function warnGoogleNotConfigured(): void {
  warnGoogle("calendar connect is not configured (check NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)");
}

export type MigrationDeps = {
  store: GoogleStore; now: () => number; warn: () => void; timeoutMs?: number;
  isDisconnected?: (user: string) => Promise<boolean>; // the user disconnected on purpose: never write the session token back
};
export type JwtGoogle = { refreshToken?: unknown; scope?: unknown };

export function createGoogleMigrator(deps: MigrationDeps) {
  const settled = new Set<string>();          // users whose db row was seen or written by this process
  const retryAt = new Map<string, number>();  // back-off after a failure so a down db is not hit on every request

  async function run(user: string, jwt: JwtGoogle, freshLogin: boolean): Promise<void> {
    try {
      const db = await deps.store.get(user);
      if (!db && deps.isDisconnected && (await deps.isDisconnected(user))) { settled.add(user); return; }
      if (shouldStoreGoogle({ db, refreshToken: jwt.refreshToken, scope: jwt.scope, freshLogin })) {
        await deps.store.save(user, {
          refresh_token: jwt.refreshToken as string, scope: jwt.scope as string,
          connected_at: new Date(deps.now()).toISOString(), status: "connected",
        });
      }
      settled.add(user);
      retryAt.delete(user);
    } catch {
      retryAt.set(user, deps.now() + RETRY_AFTER_FAILURE_MS);
      deps.warn();
    }
  }

  /** Never throws and never waits longer than timeoutMs; a timeout skips the migration and applies the usual back-off. */
  async function migrate(user: string, jwt: JwtGoogle, freshLogin: boolean): Promise<void> {
    if (typeof jwt.refreshToken !== "string" || !jwt.refreshToken || !hasGoogleScopes(jwt.scope)) return;
    if (!freshLogin && (settled.has(user) || deps.now() < (retryAt.get(user) ?? 0))) return;
    const finished = await raceTimeout(run(user, jwt, freshLogin), deps.timeoutMs ?? MIGRATION_TIMEOUT_MS);
    if (!finished) retryAt.set(user, deps.now() + RETRY_AFTER_FAILURE_MS);
  }

  return { migrate };
}

const defaults = createGoogleMigrator({ store: dbGoogleStore, now: () => Date.now(), warn: warnGoogleStoreFailed, isDisconnected: dbGoogleStore.isDisconnected });
export const migrateGoogleFromJwt = defaults.migrate;
