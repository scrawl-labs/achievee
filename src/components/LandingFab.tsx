"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./I18n";

/** Mallow floating at the bottom right of the landing page, like the diary's: the way in to /mallow, no sign-in needed. */
export default function LandingFab() {
  const { t } = useI18n();
  const [hint, setHint] = useState(false);
  useEffect(() => {
    const show = window.setTimeout(() => setHint(true), 2500);
    const hide = window.setTimeout(() => setHint(false), 9000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);
  return (
    <div className="bori-fab landing">
      <span className={`bori-fab-hint${hint ? " on" : ""}`} aria-hidden="true">{t("buddy.tryCta")}</span>
      <a className="bori-fab-btn" href="/mallow" aria-label={t("buddy.tryCta")} title={t("buddy.tryCta")}
        onMouseEnter={() => setHint(true)} onMouseLeave={() => setHint(false)} onFocus={() => setHint(true)} onBlur={() => setHint(false)}>
        <img src="/buddy/bori.png" alt="" width={64} height={64} />
      </a>
    </div>
  );
}
