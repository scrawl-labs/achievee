"use client";
import { GOOGLE_CONNECT_URL, GOOGLE_DISCONNECT_URL, googleStatusOf, type GoogleStatus } from "@/lib/googleStatus";
import { invalidate, useApi } from "./useApi";

/**
 * Google's connection state, read from /api/integrations (the same cached request the Integrations screen uses).
 * Chosen over the X-Google-Status header of /api/events because useApi only hands back parsed JSON, and one status
 * shared by every Google view beats re-deriving it from each events request. `null` until it is known.
 */
export function useGoogleStatus(): { status: GoogleStatus | null; reload: () => Promise<void> } {
  const { data, reload } = useApi<unknown>("/api/integrations");
  return { status: googleStatusOf(data), reload };
}

/** Leaves for Google's consent screen (a full page navigation; the server sends the user back to the app). */
export const startGoogleConnect = () => window.location.assign(GOOGLE_CONNECT_URL);

/** Disconnect, then refresh everything that depends on it. Resolves false if the server refused. */
export async function disconnectGoogle(): Promise<boolean> {
  try {
    const r = await fetch(GOOGLE_DISCONNECT_URL, { method: "DELETE" });
    if (!r.ok) return false;
  } catch { return false; }
  invalidate("/api/integrations");
  invalidate("/api/month");
  invalidate("/api/events");
  return true;
}
