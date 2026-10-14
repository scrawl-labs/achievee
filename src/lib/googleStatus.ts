import type { Key } from "./i18n";

/** Pure logic behind the Google connect UI: what the server says -> what the screen shows. No React, no I/O. */

export type GoogleStatus = "connected" | "revoked" | "none";
export type GoogleReturn = "connected" | "error" | "partial";

export const GOOGLE_CONNECT_URL = "/api/integrations/google/connect";
export const GOOGLE_DISCONNECT_URL = "/api/integrations/google";

const STATUSES: readonly string[] = ["connected", "revoked", "none"];
const RETURNS: readonly string[] = ["connected", "error", "partial"];

/** The google entry of GET /api/integrations, or null while loading / if the shape is not what the contract says. */
export function googleStatusOf(list: unknown): GoogleStatus | null {
  if (!Array.isArray(list)) return null;
  const g = list.find((c): c is { provider: string; status?: unknown } => typeof c === "object" && c !== null && (c as { provider?: unknown }).provider === "google");
  return g && typeof g.status === "string" && STATUSES.includes(g.status) ? (g.status as GoogleStatus) : null;
}

export type GoogleCardModel = { state: GoogleStatus | "loading"; action: "connect" | "reconnect" | null; canDisconnect: boolean };

export function googleCardModel(status: GoogleStatus | null): GoogleCardModel {
  switch (status) {
    case "none": return { state: "none", action: "connect", canDisconnect: false };
    case "connected": return { state: "connected", action: null, canDisconnect: true };
    case "revoked": return { state: "revoked", action: "reconnect", canDisconnect: true };
    default: return { state: "loading", action: null, canDisconnect: false };
  }
}

/** `?tab=integrations&google=connected|error|partial`, the way back from Google's consent screen. */
export function parseGoogleReturn(search: string): { tab: "integrations"; result: GoogleReturn } | null {
  const q = new URLSearchParams(search);
  const result = q.get("google");
  if (q.get("tab") !== "integrations" || result === null || !RETURNS.includes(result)) return null;
  return { tab: "integrations", result: result as GoogleReturn };
}

/** The same query without the return markers (other params survive), ready for history.replaceState. */
export function stripGoogleReturn(search: string): string {
  const q = new URLSearchParams(search);
  q.delete("tab");
  q.delete("google");
  const rest = q.toString();
  return rest ? `?${rest}` : "";
}

const RETURN_KEY: Readonly<Record<GoogleReturn, Key>> = { connected: "gc.retConnected", error: "gc.retError", partial: "gc.retPartial" };
export const returnMessageKey = (r: GoogleReturn): Key => RETURN_KEY[r];
