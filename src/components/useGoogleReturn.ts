"use client";
import { useCallback, useEffect, useState } from "react";
import { type GoogleReturn, parseGoogleReturn, stripGoogleReturn } from "@/lib/googleStatus";

/**
 * Reads `?tab=integrations&google=...` once when the app loads (client only: App renders after mount) and removes it
 * from the address bar, so a refresh or a shared link does not replay the message. `result` stays until `dismiss()`.
 */
export function useGoogleReturn(): { tab: "integrations" | null; result: GoogleReturn | null; dismiss: () => void } {
  const [parsed] = useState(() => parseGoogleReturn(window.location.search));
  const [result, setResult] = useState<GoogleReturn | null>(parsed?.result ?? null);
  useEffect(() => {
    if (!parsed) return;
    const { pathname, search, hash } = window.location;
    window.history.replaceState(window.history.state, "", `${pathname}${stripGoogleReturn(search)}${hash}`);
  }, [parsed]);
  return { tab: parsed?.tab ?? null, result, dismiss: useCallback(() => setResult(null), []) };
}
