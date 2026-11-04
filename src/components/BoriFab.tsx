"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { todayStr } from "@/lib/clientTime";
import { postBoriSave } from "@/lib/boriSave";
import { useI18n } from "./I18n";
import { BuddyGame, usePrefetchBori, type SaveResult } from "./EmotionBuddy";

/**
 * Bori floating at the bottom right of the diary, like a help-desk chat button. Tapping it opens the full-screen
 * conversation; at the end the words and a note go into today's diary and Bori brings you back to it.
 * `beforeOpen` saves anything typed in the diary but not yet saved, so nothing is lost when the diary reloads.
 */
export default function BoriFab({ beforeOpen, onSaved }: { beforeOpen?: () => Promise<void>; onSaved: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  usePrefetchBori();

  // a little "how was your heart today?" bubble now and then
  useEffect(() => {
    const show = window.setTimeout(() => setHint(true), 1500);
    const hide = window.setTimeout(() => setHint(false), 7500);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try { await beforeOpen?.(); } finally { setBusy(false); }
    setWords([]); setHint(false); setOpen(true);
  };
  const run = (ids: string[], note: string): Promise<SaveResult> => postBoriSave({ date: todayStr(), ids, note });
  const done = () => { setOpen(false); onSaved(); };

  return (
    <>
      <div className={`bori-fab${open ? " hidden" : ""}`}>
        <span className={`bori-fab-hint${hint ? " on" : ""}`} aria-hidden="true">{t("buddy.fabHint")}</span>
        <button type="button" className="bori-fab-btn" onClick={start} disabled={busy} aria-label={t("buddy.start")} title={t("buddy.start")}
          onMouseEnter={() => setHint(true)} onMouseLeave={() => setHint(false)}>
          <img src="/buddy/bori.png" alt="" width={64} height={64} />
        </button>
      </div>
      {open && createPortal(
        <BuddyGame value={words} onChange={setWords} onClose={() => setOpen(false)} save={{ signedIn: true, run, after: done }} />,
        document.body,
      )}
    </>
  );
}
