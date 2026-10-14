"use client";
import { useEffect } from "react";

/** Registers the app-shell service worker (production only, so development never serves cached files). Renders nothing. */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {}); // a failure only means no install / offline page
  }, []);
  return null;
}
