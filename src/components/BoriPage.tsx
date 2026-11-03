"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { GOOGLE_HL } from "@/lib/i18n";
import { todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import { BuddyGame, type SaveResult } from "./EmotionBuddy";

/** Words waiting to be saved while a guest signs in. */
const PENDING = "achievee:boriPending";
type Pending = { date: string; ids: string[]; note?: string };

async function post(p: Pending): Promise<SaveResult> {
  try {
    const res = await fetch("/api/diary/emotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: p.date, emotions: p.ids, note: p.note ?? "" }) });
    if (!res.ok) return "error";
    const j = await res.json();
    return { added: j.added ?? [], left: j.left ?? [] };
  } catch { return "error"; }
}

/**
 * /bori: talk with Bori without signing in. At the end the words go into today's diary; a guest signs in with
 * Google first and comes back here, where the waiting words are saved straight away.
 */
export default function BoriPage({ signedIn }: { signedIn: boolean }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState<string[]>([]);
  const [initial, setInitial] = useState<SaveResult | undefined>();
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // run once, even when React mounts effects twice in development
    started.current = true;
    let pending: Pending | null = null;
    try { pending = JSON.parse(localStorage.getItem(PENDING) ?? "null"); } catch { /* storage blocked or bad data */ }
    if (!signedIn || !pending || !Array.isArray(pending.ids) || pending.ids.length === 0) { setReady(true); return; }
    try { localStorage.removeItem(PENDING); } catch { /* storage blocked */ }
    const p = pending;
    void post(p).then((r) => { setValue(p.ids); setInitial(r); setReady(true); });
  }, [signedIn]);

  const run = async (ids: string[], note: string): Promise<SaveResult | void> => {
    const p = { date: todayStr(), ids, note };
    if (signedIn) return post(p);
    try { localStorage.setItem(PENDING, JSON.stringify(p)); } catch { /* storage blocked: they will pick again after signing in */ }
    await signIn("google", { callbackUrl: "/bori" }, { hl: GOOGLE_HL[locale] });
  };

  if (!ready) return <div className="bdg bd" aria-busy="true" />;
  return <BuddyGame value={value} onChange={setValue} onClose={() => router.push("/")} save={{ signedIn, run, initial }} />;
}
