"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./I18n";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const toBytes = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4), raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
type State = "loading" | "off" | "on" | "denied" | "unsupported";
const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** The 9 pm "how did today feel?" reminder for this device. Needs an installed app on iPhone; says so instead of failing silently. */
export default function ReminderToggle() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    if (!KEY) return;
    if (!supported()) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    let live = true;
    // `ready` never settles when no service worker was registered (it is only registered in production), so make sure one exists and do not wait forever
    const waitReady = async () => {
      if (!(await navigator.serviceWorker.getRegistration())) await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
    };
    waitReady()
      .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
      .then((sub) => { if (live) setState(sub ? "on" : "off"); })
      .catch(() => { if (live) setState("off"); });
    return () => { live = false; };
  }, []);

  if (!KEY) return null;
  if (state === "loading") return <span className="muted">…</span>;
  if (state === "unsupported") return <span className="muted">{t("rem.needInstall")}</span>;
  if (state === "denied") return <span className="muted">{t("rem.denied")}</span>;

  const toggle = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (state === "on") {
        if (existing) { await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: existing.endpoint }) }); await existing.unsubscribe(); }
        setState("off");
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") { setState(Notification.permission === "denied" ? "denied" : "off"); return; }
      const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(KEY) });
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, locale }) });
      if (!r.ok) { await sub.unsubscribe(); return; }
      setState("on");
    } catch { /* the toggle simply stays where it was */ }
  };
  return <button type="button" onClick={toggle} aria-pressed={state === "on"}>{state === "on" ? t("rem.turnOff") : t("rem.turnOn")}</button>;
}
