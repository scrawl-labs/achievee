"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./I18n";

const plain = (s: string) => s.replace(/[\^*]/g, "");

/** Types a line out, the way Mallow talks in the game. */
function useTyped(text: string, reduce: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) { setN(text.length); return; }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => { i++; setN(i); if (i >= text.length) window.clearInterval(id); }, 38);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  return text.slice(0, n);
}

/**
 * The landing page's Mallow section: Mallow in the meadow (the same picture as in the game), Mallow's opening line
 * typed in a speech bubble, and the way in to /mallow (no account needed).
 */
export default function LandingBori() {
  const { t } = useI18n();
  const [reduce, setReduce] = useState(false);
  useEffect(() => { setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  const line = useTyped(plain(t("buddy.hi", { name: t("buddy.friend") })), reduce);

  return (
    <section className="borisec" aria-labelledby="borisec-title">
      <div className="borisec-copy">
        <h2 id="borisec-title">{t("land.bori.t")}</h2>
        <p>{t("land.bori.d")}</p>
        <a className="borisec-cta" href="/mallow">{t("land.bori.cta")}</a>
        <small>{t("land.bori.note")}</small>
      </div>
      <div className="borisec-stage">
        <div className="borisec-screen">
          <img src="/mallow/meadow/wide-base.webp" alt="" width={1920} height={1080} />
          <div className="borisec-bubble" aria-live="polite">
            <b>{t("buddy.name")}</b>
            <p>{line}<span className="borisec-caret" aria-hidden="true" /></p>
          </div>
        </div>
      </div>
    </section>
  );
}
