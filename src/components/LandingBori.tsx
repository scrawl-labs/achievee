"use client";
import { useEffect, useState } from "react";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";

const PLACES: { id: string; name: Key; hi: Key }[] = [
  { id: "forest", name: "buddy.mapForest", hi: "buddy.hi" },
  { id: "subway", name: "buddy.mapSubway", hi: "buddy.hiSubway" },
  { id: "rain", name: "buddy.mapRain", hi: "buddy.hiRain" },
  { id: "beach", name: "buddy.mapBeach", hi: "buddy.hiBeach" },
];
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
 * The landing page's Mallow section: stills of the four places turning like a slideshow, with Mallow's opening line
 * typed in a speech bubble, the place tabs, and the way in to /mallow (no account needed).
 */
export default function LandingBori() {
  const { t } = useI18n();
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [live, setLive] = useState(false);
  useEffect(() => { setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches); setLive(true); }, []);
  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setInterval(() => setAt((a) => (a + 1) % PLACES.length), 6500);
    return () => window.clearInterval(id);
  }, [paused, reduce]);
  const place = PLACES[at];
  const line = useTyped(plain(t(place.hi, { name: t("buddy.friend") })), reduce);

  return (
    <section className={`borisec${live ? " js" : ""}`} aria-labelledby="borisec-title">
      <div className="borisec-copy">
        <h2 id="borisec-title">{t("land.bori.t")}</h2>
        <p>{t("land.bori.d")}</p>
        <a className="borisec-cta" href="/mallow">{t("land.bori.cta")}</a>
        <small>{t("land.bori.note")}</small>
      </div>
      <div className="borisec-stage" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
        <div className="borisec-screen">
          {PLACES.map((p, i) => (
            <img key={p.id} src={`/buddy/places/${p.id}.jpg`} alt="" className={i === at ? "on" : ""} loading={i ? "lazy" : "eager"} width={960} height={720} />
          ))}
          <div className="borisec-bubble" aria-live="polite">
            <b>{t("buddy.name")}</b>
            <p>{line}<span className="borisec-caret" aria-hidden="true" /></p>
          </div>
        </div>
        <div className="borisec-tabs" role="tablist" aria-label={t("buddy.place")}>
          {PLACES.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={i === at} className={i === at ? "on" : ""} onClick={() => { setAt(i); setPaused(true); }}>{t(p.name)}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
