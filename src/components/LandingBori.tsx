"use client";
import { useEffect, useState } from "react";
import { emoLang, wordText } from "@/lib/emotions";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";

type Step = { line: Key; opts: Key[] | string[]; words?: boolean };
/** What Mallow actually does, in the order he does it: three small questions, then a few words to choose from. */
const STEPS: Step[] = [
  { line: "buddy.hi", opts: ["emo.q1pos", "emo.q1neg", "emo.q1mixed"] },
  { line: "buddy.q2", opts: ["emo.q2self", "emo.q2other", "emo.q2situation"] },
  { line: "buddy.q3", opts: ["emo.q3high", "emo.q3low"] },
  { line: "buddy.result", opts: ["proud", "relieved", "light"], words: true },
];
const plain = (s: string) => s.replace(/[\^*]/g, "");

/** Types a line out, the way Mallow talks in the game. */
function useTyped(text: string, reduce: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) { setN(text.length); return; }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => { i++; setN(i); if (i >= text.length) window.clearInterval(id); }, 34);
    return () => window.clearInterval(id);
  }, [text, reduce]);
  return text.slice(0, n);
}

/**
 * The landing page's Mallow section: Mallow on a pastel field asking his questions one after another, with the answers
 * you would tap, ending on the words he offers. The way in to /mallow is the floating Mallow (LandingFab).
 */
export default function LandingBori() {
  const { t, locale } = useI18n();
  const lang = emoLang(locale);
  const [at, setAt] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [live, setLive] = useState(false);
  useEffect(() => { setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches); setLive(true); }, []);
  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setInterval(() => setAt((a) => (a + 1) % STEPS.length), 5200);
    return () => window.clearInterval(id);
  }, [paused, reduce]);
  const step = STEPS[at];
  const line = useTyped(plain(t(step.line, { name: t("buddy.friend") })), reduce);

  return (
    <section className={`borisec${live ? " js" : ""}`} aria-labelledby="borisec-title">
      <div className="borisec-copy">
        <h2 id="borisec-title">{t("land.bori.t")}</h2>
        <p>{t("land.bori.d")}</p>
      </div>
      <div className="borisec-stage" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
        <div className="borisec-screen">
          <img className="borisec-mallow" src="/buddy/bori.png" alt="" width={420} height={420} />
          <div className="borisec-talk">
            <div className="borisec-bubble" aria-live="polite">
              <b>{t("buddy.name")}</b>
              <p>{line}<span className="borisec-caret" aria-hidden="true" /></p>
            </div>
            <div className="borisec-opts" aria-hidden="true">
              {step.opts.map((o, i) => (
                <span key={`${at}-${o}`} className={i === (step.words ? 0 : 0) ? "on" : ""}>{step.words ? wordText(o, lang) : t(o as Key)}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="borisec-dots" role="tablist" aria-label={t("land.bori.e")}>
          {STEPS.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === at} aria-label={`${i + 1} / ${STEPS.length}`} className={i === at ? "on" : ""} onClick={() => { setAt(i); setPaused(true); }} />
          ))}
        </div>
      </div>
    </section>
  );
}
