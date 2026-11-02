"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { MAX_EMOTIONS, type Energy, type Focus, type Intensity, type Lean, emoLang, familyById, rankWords, wordById } from "@/lib/emotions";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";

type Ans = { lean?: Lean; focus?: Focus | "skip"; energy?: Energy | "skip"; intensity?: Intensity | "skip" };
import type { Face } from "./BuddyScene";
type Emote = "note" | "drop" | "q" | "spark" | null;

const OPTS: [string, Key][][] = [
  [["pos", "emo.q1pos"], ["neg", "emo.q1neg"], ["mixed", "emo.q1mixed"]],
  [["self", "emo.q2self"], ["other", "emo.q2other"], ["situation", "emo.q2situation"], ["skip", "emo.skip"]],
  [["high", "emo.q3high"], ["low", "emo.q3low"], ["skip", "emo.skip"]],
  [["mild", "emo.q4mild"], ["strong", "emo.q4strong"], ["skip", "emo.skip"]],
];
const PAGE = 6;
const SOUND_KEY = "achievee:buddyVoice";
const BuddyScene = dynamic(() => import("./BuddyScene"), { ssr: false });

/* ---------- a tiny markup for dialogue: ^name^ is green, *keyword* is orange ---------- */
type Seg = { s: string; c?: "n" | "k" };
function parse(line: string): Seg[] {
  const out: Seg[] = [];
  const re = /\^([^^]+)\^|\*([^*]+)\*/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ s: line.slice(last, m.index) });
    out.push(m[1] !== undefined ? { s: m[1], c: "n" } : { s: m[2], c: "k" });
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ s: line.slice(last) });
  return out;
}

/* ---------- a soft, high voice: one short blip per syllable ---------- */
let ctx: AudioContext | null = null;
function blip(ch: string) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const code = ch.codePointAt(0) ?? 0;
  o.type = "triangle";
  o.frequency.setValueAtTime(560 + (code % 9) * 34, t);
  o.frequency.exponentialRampToValueAtTime(420 + (code % 5) * 30, t + 0.06);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.06, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.08);
}

/** Types the line out one character at a time; returns how many characters show and a way to skip ahead. */
function useTypewriter(text: string, voice: boolean) {
  const [n, setN] = useState(0);
  const total = useMemo(() => [...text].length, [text]);
  const reduce = useRef(false);
  useEffect(() => { reduce.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; }, []);
  useEffect(() => {
    if (reduce.current) { setN(total); return; }
    setN(0);
    const chars = [...text];
    let i = 0, timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i++;
      setN(i);
      const ch = chars[i - 1];
      if (voice && ch && /[\p{L}\p{N}]/u.test(ch) && i % 2 === 1) blip(ch);
      if (i < chars.length) timer = setTimeout(tick, /[.!?…。！？]/.test(ch) ? 220 : /[,、，]/.test(ch) ? 120 : 34);
    };
    timer = setTimeout(tick, 260);
    return () => clearTimeout(timer);
  }, [text, total, voice]);
  return { shown: n, done: n >= total, finish: () => setN(total) };
}

function Line({ segs, shown }: { segs: Seg[]; shown: number }) {
  let left = shown;
  return (
    <>
      {segs.map((g, i) => {
        const chars = [...g.s];
        const vis = chars.slice(0, Math.max(0, left)).join("");
        const rest = chars.slice(Math.max(0, left)).join("");
        left -= chars.length;
        const cls = g.c === "n" ? "bd-n" : g.c === "k" ? "bd-k" : undefined;
        // the not-yet-typed part keeps its space so the box does not jump as the text grows
        return <span key={i} className={cls}>{vis}{rest && <span className="bd-ghost">{rest}</span>}</span>;
      })}
    </>
  );
}

/* ---------- Bori, an original bunny drawn in SVG ---------- */
function Bori({ face, talking, beat }: { face: Face; talking: boolean; beat: number }) {
  const happy = face === "happy" || face === "joy";
  return (
    <svg className={`bori f-${face}${talking ? " talk" : ""}`} viewBox="0 0 200 200" role="img" aria-hidden="true">
      <defs>
        <radialGradient id="bd-fur" cx="42%" cy="34%" r="70%">
          <stop offset="0" stopColor="#fff0d4" />
          <stop offset=".55" stopColor="#f9dcab" />
          <stop offset="1" stopColor="#efc48a" />
        </radialGradient>
        <radialGradient id="bd-body" cx="45%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fde8c4" />
          <stop offset="1" stopColor="#ecbf84" />
        </radialGradient>
        <linearGradient id="bd-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe2b8" />
          <stop offset="1" stopColor="#efc78f" />
        </linearGradient>
        <linearGradient id="bd-scarf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd6b3" />
          <stop offset="1" stopColor="#5fb58d" />
        </linearGradient>
        <filter id="bd-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" /></filter>
      </defs>

      <ellipse className="bd-shadow" cx="100" cy="190" rx="44" ry="6.5" />

      <g className="bd-all" key={`hop-${beat}`}>
        {/* body */}
        <g className="bd-body">
          <g className="bd-tail"><circle cx="139" cy="176" r="10" fill="#fff4e0" stroke="#c99a62" strokeWidth="2" /><circle cx="136" cy="172" r="3.5" fill="#fff" opacity=".7" /></g>
          <ellipse cx="80" cy="185" rx="14" ry="7.5" fill="#f3cf9c" stroke="#c99a62" strokeWidth="2" />
          <ellipse cx="120" cy="185" rx="14" ry="7.5" fill="#f3cf9c" stroke="#c99a62" strokeWidth="2" />
          <path d="M62 170c0-22 17-36 38-36s38 14 38 36c0 12-10 18-38 18s-38-6-38-18z" fill="url(#bd-body)" stroke="#c99a62" strokeWidth="2.2" />
          <ellipse cx="100" cy="171" rx="21" ry="14" fill="#fff3dc" opacity=".9" />
          <ellipse cx="73" cy="164" rx="9" ry="12" transform="rotate(22 73 164)" fill="#f7d8a8" stroke="#c99a62" strokeWidth="2" />
          <ellipse cx="127" cy="164" rx="9" ry="12" transform="rotate(-22 127 164)" fill="#f7d8a8" stroke="#c99a62" strokeWidth="2" />
        </g>

        {/* head, ears and face tilt together */}
        <g className="bd-head">
          <g className="bd-earL">
            <path d="M70 76C58 46 60 14 76 8c14-5 20 28 14 66z" fill="url(#bd-ear)" stroke="#c99a62" strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M74 68c-7-22-6-44 3-50 7-3 10 22 7 48z" fill="#f8b9b1" />
          </g>
          <g className="bd-earR">
            <path d="M110 74c-6-38 0-71 14-66 16 6 18 38 6 68z" fill="url(#bd-ear)" stroke="#c99a62" strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M116 66c-3-26 0-48 7-45 9 6 10 26 3 46z" fill="#f8b9b1" />
          </g>

          {/* scarf sits under the chin */}
          <path d="M60 136c24 15 56 15 80 0l2 11c-26 18-58 18-84 0z" fill="url(#bd-scarf)" stroke="#4d9d78" strokeWidth="2" strokeLinejoin="round" />
          <path d="M118 146l14 18-16-2-4-14z" fill="url(#bd-scarf)" stroke="#4d9d78" strokeWidth="2" strokeLinejoin="round" />

          <path d="M100 52c33 0 60 20 60 50 0 30-26 44-60 44s-60-14-60-44c0-30 27-50 60-50z" fill="url(#bd-fur)" stroke="#c99a62" strokeWidth="2.4" />
          <path d="M92 56c2-9 7-12 9-6 2-8 9-8 9 0" fill="none" stroke="#c99a62" strokeWidth="2.2" strokeLinecap="round" />

          {/* cheeks */}
          <ellipse className="bd-blush" cx="63" cy="118" rx="11" ry="6.5" fill="#ff9c9c" filter="url(#bd-soft)" />
          <ellipse className="bd-blush" cx="137" cy="118" rx="11" ry="6.5" fill="#ff9c9c" filter="url(#bd-soft)" />

          {/* eyes */}
          {happy ? (
            <g fill="none" stroke="#3b2a20" strokeWidth="3.6" strokeLinecap="round">
              <path d="M70 105q8-10 16 0" />
              <path d="M114 105q8-10 16 0" />
            </g>
          ) : (
            <g className="bd-eyes">
              <ellipse cx="78" cy="103" rx="8.4" ry={face === "sad" ? 9 : 10.5} fill="#3b2a20" />
              <ellipse cx="122" cy="103" rx="8.4" ry={face === "sad" ? 9 : 10.5} fill="#3b2a20" />
              <circle cx="81" cy="98.5" r="3.1" fill="#fff" />
              <circle cx="125" cy="98.5" r="3.1" fill="#fff" />
              <circle cx="75.5" cy="107" r="1.5" fill="#fff" opacity=".85" />
              <circle cx="119.5" cy="107" r="1.5" fill="#fff" opacity=".85" />
            </g>
          )}
          {face === "sad" && (
            <g fill="none" stroke="#a9794a" strokeWidth="2.6" strokeLinecap="round">
              <path d="M68 89l15-4" />
              <path d="M117 85l15 4" />
            </g>
          )}
          {face === "think" && (
            <g fill="none" stroke="#a9794a" strokeWidth="2.6" strokeLinecap="round">
              <path d="M69 87q8-4 15 0" />
              <path d="M116 85l15 2" />
            </g>
          )}

          {/* muzzle, nose, mouth */}
          <ellipse cx="100" cy="121" rx="15" ry="10" fill="#fff4e0" />
          <path d="M95 114.5q5-3 10 0-1.6 5-5 5.4-3.4-.4-5-5.4z" fill="#ea8a80" />
          <path className="bd-mclosed" d="M93 124q3.5 3.6 7 0 3.5 3.6 7 0" fill="none" stroke="#5a3a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <g className="bd-mopen">
            <path d="M94.5 123q5.5-1 11 0-1 9.5-5.5 9.5t-5.5-9.5z" fill="#7a3b34" />
            <ellipse cx="100" cy="130" rx="3.4" ry="1.9" fill="#f29090" />
          </g>
        </g>
      </g>

      <Emoticon face={face} beat={beat} />
    </svg>
  );
}

function Emoticon({ face, beat }: { face: Face; beat: number }) {
  const e: Emote = face === "happy" ? "note" : face === "sad" ? "drop" : face === "think" ? "q" : face === "joy" ? "spark" : null;
  if (!e) return null;
  return (
    <g className="bd-emote" key={`${e}-${beat}`} transform="translate(160 44)">
      <g className="bd-emote-in">
        {e === "note" && (
          <g fill="#f2973a">
            <path d="M-2 -16v20a6 5 0 1 1-3-4.4V-12l14-4v16a6 5 0 1 1-3-4.4v-9.6z" />
          </g>
        )}
        {e === "drop" && <path d="M0-14c7 9 9 14 9 18a9 9 0 0 1-18 0c0-4 2-9 9-18z" fill="#8fcaf4" stroke="#5aa7dd" strokeWidth="1.6" />}
        {e === "q" && <text x="0" y="6" textAnchor="middle" fontSize="28" fontWeight="900" fill="#f2973a" stroke="#fff" strokeWidth="3" paintOrder="stroke">?</text>}
        {e === "spark" && (
          <g fill="#ffcf3f" stroke="#f0a91f" strokeWidth="1.2" strokeLinejoin="round">
            <path d="M0-16l3.6 10.4L14 -2l-10.4 3.6L0 12l-3.6-10.4L-14-2l10.4-3.6z" />
            <path d="M16 6l1.6 4.4L22 12l-4.4 1.6L16 18l-1.6-4.4L10 12l4.4-1.6z" />
          </g>
        )}
      </g>
    </g>
  );
}

/** The diary's entry point: a small card that opens the full-screen 3D conversation with Bori. */
export default function EmotionBuddy({ value, onChange, onBrowse }: { value: string[]; onChange: (v: string[]) => void; onBrowse: () => void }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <button type="button" className="bd-launch" onClick={() => setPlaying(true)}>
        <span className="bd-launch-art"><Bori face="idle" talking={false} beat={0} /></span>
        <span className="bd-launch-txt"><b>{t("buddy.start")}</b><small>{t("buddy.startSub")}</small></span>
        <span className="bd-launch-go" aria-hidden="true">▶</span>
      </button>
      {playing && createPortal(
        <BuddyGame value={value} onChange={onChange} onClose={() => setPlaying(false)} onBrowse={() => { setPlaying(false); onBrowse(); }} />,
        document.body,
      )}
    </>
  );
}

function useNight() {
  const [night, setNight] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => {
      const forced = document.documentElement.getAttribute("data-theme");
      setNight(forced === "dark" || (forced !== "light" && mq.matches));
    };
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return night;
}

/**
 * Full-screen: Bori stands on a little 3D island and asks the four "help me find it" questions in a game-style
 * speech box, then offers words that might fit. Same questions and ranking as before; only the way they are asked changed.
 */
function BuddyGame({ value, onChange, onClose, onBrowse }: { value: string[]; onChange: (v: string[]) => void; onClose: () => void; onBrowse: () => void }) {
  const { t, locale } = useI18n();
  const lang = emoLang(locale);
  const { data: session } = useSession();
  const night = useNight();
  const root = useRef<HTMLDivElement>(null);
  const [ans, setAns] = useState<Ans>({});
  const [pages, setPages] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const [beat, setBeat] = useState(0); // bumps on every new line so Bori hops and the emote replays
  const [voice, setVoice] = useState(false);
  const [no3d, setNo3d] = useState(false);
  useEffect(() => { try { setVoice(localStorage.getItem(SOUND_KEY) === "1"); } catch { /* storage blocked */ } }, []);

  // take over the screen: lock page scroll, go full screen where the browser allows it, Esc closes
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = root.current;
    if (el?.requestFullscreen && window.matchMedia("(pointer: coarse)").matches) el.requestFullscreen().catch(() => { /* not allowed */ });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) onClose(); };
    const onFs = () => { if (!document.fullscreenElement && el?.dataset.fs === "1") onClose(); if (document.fullscreenElement) el && (el.dataset.fs = "1"); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    el?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { /* already gone */ });
    };
  }, [onClose]);

  const raw = session?.user?.name?.trim() ?? "";
  const name = raw ? (/\s/.test(raw) && !/[぀-ヿ㐀-鿿가-힯]/.test(raw) ? raw.split(/\s+/)[0] : raw) : t("buddy.friend");

  const total = ans.lean === "mixed" ? 3 : 4; // "how strong" says little when the feeling is mixed
  const step = !ans.lean ? 1 : !ans.focus ? 2 : !ans.energy ? 3 : total === 4 && !ans.intensity ? 4 : 5;
  const ranked = useMemo(() => step === 5
    ? rankWords({ lean: ans.lean!, focus: ans.focus === "skip" ? undefined : ans.focus, energy: ans.energy === "skip" ? undefined : ans.energy, intensity: ans.intensity === "skip" ? undefined : ans.intensity })
    : [], [step, ans]);
  const results = ranked.slice(0, PAGE * pages);
  const full = value.length >= MAX_EMOTIONS;

  const reaction: Key = ans.lean === "pos" ? "buddy.rpos" : ans.lean === "neg" ? "buddy.rneg" : "buddy.rmixed";
  const pickedWord = picked ? wordById(picked) : null;
  const line =
    step === 1 ? t("buddy.hi", { name })
    : step === 2 ? `${t(reaction)} ${t("buddy.q2")}`
    : step === 3 ? t("buddy.q3")
    : step === 4 ? t("buddy.q4")
    : pickedWord ? (full ? t("buddy.full") : t("buddy.picked", { word: pickedWord[lang][0] }))
    : t("buddy.result");
  const face: Face =
    step === 5 && pickedWord ? "joy"
    : step === 2 ? (ans.lean === "pos" ? "happy" : ans.lean === "neg" ? "sad" : "think")
    : step === 5 ? "happy" : "idle";

  const segs = useMemo(() => parse(line), [line]);
  const plain = useMemo(() => segs.map((s) => s.s).join(""), [segs]);
  const { shown, done, finish } = useTypewriter(plain, voice);

  const say = useCallback((next: Ans) => { setAns(next); setBeat((b) => b + 1); }, []);
  const answer = (k: string) => {
    if (step === 1) say({ lean: k as Lean });
    else if (step === 2) say({ ...ans, focus: k as Focus | "skip" });
    else if (step === 3) say({ ...ans, energy: k as Energy | "skip" });
    else say({ ...ans, intensity: k as Intensity | "skip" });
  };
  const back = () => { setPicked(null); say(ans.intensity ? { ...ans, intensity: undefined } : ans.energy ? { ...ans, energy: undefined } : ans.focus ? { ...ans, focus: undefined } : {}); };
  const restart = () => { setPages(1); setPicked(null); say({}); };
  const toggle = (id: string) => {
    if (value.includes(id)) { onChange(value.filter((x) => x !== id)); if (picked === id) setPicked(null); return; }
    if (full) return;
    onChange([...value, id]);
    setPicked(id);
    setBeat((b) => b + 1);
  };
  const toggleVoice = () => {
    const v = !voice;
    setVoice(v);
    try { localStorage.setItem(SOUND_KEY, v ? "1" : "0"); } catch { /* storage blocked */ }
    if (v && !ctx) { try { ctx = new AudioContext(); } catch { /* no audio */ } }
    void ctx?.resume?.();
  };
  // a voice left on from last time needs a tap before the browser lets it play
  useEffect(() => {
    if (!voice || ctx) return;
    const wake = () => { try { ctx = new AudioContext(); } catch { /* no audio */ } };
    window.addEventListener("pointerdown", wake, { once: true });
    return () => window.removeEventListener("pointerdown", wake);
  }, [voice]);

  const choices = step <= 4 ? OPTS[step - 1] : null;

  return (
    <div className={`bdg bd${night ? " night" : ""}`} ref={root} role="dialog" aria-modal="true" aria-label={t("buddy.start")} tabIndex={-1}>
      {no3d
        ? <div className="bdg-flat"><div className="bdg-flat-char"><Bori face={face} talking={!done} beat={beat} /></div></div>
        : <BuddyScene face={face} talking={!done} beat={beat} night={night} onFail={() => setNo3d(true)} />}
      <div className="bdg-vignette" aria-hidden="true" />

      <div className="bdg-top">
        <button type="button" className="bd-mini bdg-close" onClick={onClose} aria-label={t("common.close")}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className="bd-progress" aria-label={`${Math.min(step, total)} / ${total}`}>
          {Array.from({ length: total }, (_, i) => <i key={i} className={i < step - 1 ? "on" : i === step - 1 ? "now" : ""} />)}
        </span>
        <span className="bdg-right">
          {step > 1 && <button type="button" className="bd-mini" onClick={back}>‹ {t("emo.back")}</button>}
          <button type="button" className={`bd-mini bd-voice${voice ? " on" : ""}`} aria-pressed={voice} onClick={toggleVoice} title={t("buddy.voice")} aria-label={t("buddy.voice")}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
              {voice ? <><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
            </svg>
          </button>
        </span>
      </div>

      <div className="bdg-hud">
        {step === 5 && (
          <div className={`bdg-cards${done || pickedWord ? " on" : ""}`}>
            {results.map((w, i) => {
              const on = value.includes(w.id);
              return (
                <button key={w.id} type="button" className={`bd-card${on ? " on" : ""}`} style={{ animationDelay: `${i * 50}ms` }} disabled={!on && full} aria-pressed={on} onClick={() => toggle(w.id)}>
                  <span className="bd-card-h"><b>{w[lang][0]}</b><small>{familyById(w.family)?.[lang]}</small><i aria-hidden="true">{on ? "✓" : "+"}</i></span>
                  <span className="bd-card-d">{w[lang][1]}</span>
                </button>
              );
            })}
            {ranked.length > results.length && <button type="button" className="bd-card bd-card-more" onClick={() => setPages(pages + 1)}><b>{t("emo.more")}</b><span aria-hidden="true">→</span></button>}
          </div>
        )}

        <div className="bdg-talk">
          {choices && (
            <div className={`bd-choices${done ? " on" : ""}`} key={`c-${step}`}>
              {choices.map(([k, label], i) => (
                <button key={k} type="button" className="bd-choice" style={{ animationDelay: `${i * 60}ms` }} disabled={!done} onClick={() => answer(k)}>{t(label)}</button>
              ))}
            </div>
          )}
          {step === 5 && (
            <div className={`bd-choices${done || pickedWord ? " on" : ""}`} key="c-end">
              {value.length > 0 && <button type="button" className="bd-choice bd-choice-main" onClick={onClose}>{t("buddy.done")}</button>}
              <button type="button" className="bd-choice" onClick={restart}>{t("buddy.again")}</button>
              <button type="button" className="bd-choice" onClick={onBrowse}>{t("emo.noneFit")}</button>
            </div>
          )}

          <div className="bd-box" onClick={() => !done && finish()} role="group" aria-label={t("buddy.name")}>
            <span className="bd-tag">{t("buddy.name")}</span>
            <p className="bd-text" aria-live="polite"><Line segs={segs} shown={shown} /></p>
            <span className="sr-only">{plain}</span>
            {!done && <button type="button" className="sr-only" onClick={finish}>{t("buddy.skip")}</button>}
            <svg className={`bd-next${done ? " on" : ""}`} viewBox="0 0 20 14" aria-hidden="true"><path d="M2.5 2.5h15q1.8 0 .9 1.6l-7.3 8q-1.1 1.2-2.2 0l-7.3-8q-.9-1.6.9-1.6z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}
