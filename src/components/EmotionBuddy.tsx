"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { MAX_EMOTIONS, type Energy, type Focus, type Intensity, type Lean, emoLang, familyById, rankWords, wordById } from "@/lib/emotions";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";

type Ans = { lean?: Lean; focus?: Focus | "skip"; energy?: Energy | "skip"; intensity?: Intensity | "skip" };
import type { Face } from "@/lib/buddy3d/character";
import type { MapId } from "./BuddyScene";
type Emote = "note" | "drop" | "q" | "spark" | null;

const OPTS: [string, Key][][] = [
  [["pos", "emo.q1pos"], ["neg", "emo.q1neg"], ["mixed", "emo.q1mixed"]],
  [["self", "emo.q2self"], ["other", "emo.q2other"], ["situation", "emo.q2situation"], ["skip", "emo.skip"]],
  [["high", "emo.q3high"], ["low", "emo.q3low"], ["skip", "emo.skip"]],
  [["mild", "emo.q4mild"], ["strong", "emo.q4strong"], ["skip", "emo.skip"]],
];
const PAGE = 6;
const SOUND_KEY = "achievee:buddyVoice";
const MAP_KEY = "achievee:buddyMap";
const MAPS: MapId[] = ["forest", "subway", "rain", "store", "beach"];
const LINES: Record<MapId, { hi: Key; result: Key; name: Key }> = {
  forest: { hi: "buddy.hi", result: "buddy.result", name: "buddy.mapForest" },
  subway: { hi: "buddy.hiSubway", result: "buddy.resultSubway", name: "buddy.mapSubway" },
  rain: { hi: "buddy.hiRain", result: "buddy.resultRain", name: "buddy.mapRain" },
  store: { hi: "buddy.hiStore", result: "buddy.resultStore", name: "buddy.mapStore" },
  beach: { hi: "buddy.hiBeach", result: "buddy.resultBeach", name: "buddy.mapBeach" },
};
/** Little line icons for the place button. */
const PLACE_ICON: Record<MapId, JSX.Element> = {
  forest: <><path d="M12 3l5 8h-3l4 6H6l4-6H7z" /><path d="M12 17v4" /></>,
  subway: <><rect x="5" y="3" width="14" height="14" rx="4" /><path d="M5 11h14M8.5 14.5h.01M15.5 14.5h.01M8 21l2-4M16 21l-2-4" /></>,
  rain: <><path d="M4 11a8 8 0 0 1 16 0z" /><path d="M12 11v7a2 2 0 0 0 4 0" /></>,
  store: <><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9h16v2a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 14a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 11z" /><path d="M6 14v6h12v-6" /></>,
  beach: <><path d="M3 15c2 0 2-1.5 4.5-1.5S10 15 12 15s2-1.5 4.5-1.5S19 15 21 15" /><path d="M3 19c2 0 2-1.5 4.5-1.5S10 19 12 19s2-1.5 4.5-1.5S19 19 21 19" /><circle cx="16" cy="7" r="3" /></>,
};
/** The place for today: the one picked last time on this device, otherwise it changes from day to day. */
function startMap(): MapId {
  try { const m = localStorage.getItem(MAP_KEY); if (m && (MAPS as string[]).includes(m)) return m as MapId; } catch { /* storage blocked */ }
  return MAPS[Math.floor(Date.now() / 86_400_000) % MAPS.length];
}
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
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
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

/** The diary's entry point: a small card that opens the full-screen conversation with Bori. */
export default function EmotionBuddy({ value, onChange, onBrowse }: { value: string[]; onChange: (v: string[]) => void; onBrowse: () => void }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <button type="button" className="bd bd-launch" onClick={() => setPlaying(true)}>
        <span className="bd-launch-art"><img src="/buddy/bori.png" alt="" width={96} height={96} /></span>
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

/** What saving to the diary came back with: which words went in and which did not fit, or that it failed. */
export type SaveResult = { added: string[]; left: string[] } | "error";
/** On the standalone /bori page: save the chosen words to today's diary (signing in first if needed). */
export type SaveTo = { signedIn: boolean; run: (ids: string[], note: string) => Promise<SaveResult | void>; initial?: SaveResult };
/** After the words, on /bori: write a line or two, then Bori asks whether to save it. */
type Phase = "chat" | "write" | "ask" | "declined";

/**
 * Full-screen: Bori after work, in one of a few places, asks the four "help me find it" questions in a game-style
 * speech box, then offers words that might fit. Same questions and ranking as before; only the way they are asked changed.
 */
export function BuddyGame({ value, onChange, onClose, onBrowse, save }: { value: string[]; onChange: (v: string[]) => void; onClose: () => void; onBrowse?: () => void; save?: SaveTo }) {
  const { t, locale, setLocale } = useI18n();
  const lang = emoLang(locale);
  const { data: session } = useSession();
  const root = useRef<HTMLDivElement>(null);
  const [ans, setAns] = useState<Ans>({});
  const [pages, setPages] = useState(1);
  const [picked, setPicked] = useState<string | null>(null);
  const [beat, setBeat] = useState(0); // bumps on every new line so Bori hops and the emote replays
  const [voice, setVoice] = useState(false);
  const [no3d, setNo3d] = useState(false);
  const [map, setMap] = useState<MapId>("forest");
  const [saved, setSaved] = useState<SaveResult | null>(save?.initial ?? null);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>("chat");
  const [note, setNote] = useState("");
  useEffect(() => { if (save?.initial) setSaved(save.initial); }, [save?.initial]);
  useEffect(() => {
    if (!save || saved === null || saved === "error") return;
    const id = window.setTimeout(() => window.location.assign("/?open=diary"), 3200); // Bori says thanks, then the diary opens
    return () => window.clearTimeout(id);
  }, [save, saved]);
  useEffect(() => { setMap(startMap()); }, []);
  const nextMap = () => {
    const m = MAPS[(MAPS.indexOf(map) + 1) % MAPS.length];
    setMap(m);
    try { localStorage.setItem(MAP_KEY, m); } catch { /* storage blocked */ }
  };
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
  const savedLine = saved === null ? null
    : saved === "error" ? t("buddy.saveFail")
    : saved.added.length === 0 ? t("buddy.savedFull")
    : saved.left.length ? t("buddy.savedSome", { n: saved.left.length })
    : t("buddy.saved");
  const phaseLine = phase === "write" ? t("buddy.writeAsk")
    : phase === "ask" ? t(save?.signedIn ? "buddy.saveAsk" : "buddy.saveAskGuest")
    : phase === "declined" ? t("buddy.declined") : null;
  const line =
    savedLine !== null ? savedLine
    : phaseLine !== null ? phaseLine
    : step === 1 ? t(LINES[map].hi, { name })
    : step === 2 ? `${t(reaction)} ${t("buddy.q2")}`
    : step === 3 ? t("buddy.q3")
    : step === 4 ? t("buddy.q4")
    : pickedWord ? (full ? t("buddy.full") : t("buddy.picked", { word: pickedWord[lang][0] }))
    : t(LINES[map].result);
  const face: Face =
    phase === "write" ? "think" : phase === "ask" || phase === "declined" ? "happy"
    : saved === "error" ? "sad"
    : saved !== null ? (saved.added.length ? "joy" : "think")
    : step === 5 && pickedWord ? "joy"
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
  const restart = () => { setPages(1); setPicked(null); setSaved(null); setPhase("chat"); setNote(""); say({}); };
  const goPhase = (p: Phase) => { setPhase(p); setBeat((b) => b + 1); };
  const doSave = async () => {
    if (!save || saving || value.length === 0) return;
    setSaving(true);
    try {
      const r = await save.run(value, note.trim());
      if (r) { setPhase("chat"); setSaved(r); setBeat((b) => b + 1); }
    } finally { setSaving(false); }
  };
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

  const choices = saved === null && phase === "chat" && step <= 4 ? OPTS[step - 1] : null;
  const routeAt = saved !== null || phase !== "chat" ? total + 1 : step;

  return (
    <div className="bdg bd" ref={root} role="dialog" aria-modal="true" aria-label={t("buddy.start")} tabIndex={-1}>
      {no3d
        ? <div className="bdg-flat"><img src="/buddy/bori.png" alt="" /></div>
        : <BuddyScene key={map} map={map} face={face} talking={!done} beat={beat} onFail={() => setNo3d(true)} />}
      <div className="bdg-vignette" aria-hidden="true" />

      <div className="bdg-top">
        <button type="button" className="bd-mini bdg-close" onClick={onClose} aria-label={t("common.close")}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className="bd-route" aria-label={`${Math.min(step, total)} / ${total}`}>
          {Array.from({ length: total + 1 }, (_, i) => <i key={i} className={i < routeAt - 1 ? "on" : i === routeAt - 1 ? "now" : ""} />)}
        </span>
        <span className="bdg-right">
          <span className="bd-lang" role="group" aria-label={t("account.language")}>
            <button type="button" aria-pressed={locale === "ko"} className={locale === "ko" ? "on" : ""} onClick={() => setLocale("ko")} lang="ko">한</button>
            <button type="button" aria-pressed={locale === "en"} className={locale === "en" ? "on" : ""} onClick={() => setLocale("en")} lang="en">EN</button>
          </span>
          {step > 1 && saved === null && phase === "chat" && <button type="button" className="bd-mini bd-back" onClick={back} aria-label={t("emo.back")}>‹<span className="bd-back-txt"> {t("emo.back")}</span></button>}
          {!no3d && (
            <button type="button" className="bd-mini bd-place" onClick={nextMap} title={t("buddy.place")} aria-label={`${t("buddy.place")}: ${t(LINES[map].name)}`}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {PLACE_ICON[map]}
              </svg>
            </button>
          )}
          <button type="button" className={`bd-mini bd-voice${voice ? " on" : ""}`} aria-pressed={voice} onClick={toggleVoice} title={t("buddy.voice")} aria-label={t("buddy.voice")}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none" />
              {voice ? <><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 6.5a7.5 7.5 0 0 1 0 11" /></> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
            </svg>
          </button>
        </span>
      </div>

      <div className="bdg-hud">
        {step === 5 && saved === null && phase === "chat" && (
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
          {step === 5 && saved === null && phase === "chat" && (
            <div className={`bd-choices bd-choices-row${done || pickedWord ? " on" : ""}`} key="c-end">
              {value.length > 0 && (save
                ? <button type="button" className="bd-choice bd-choice-main" onClick={() => goPhase("write")}>{t("buddy.donePick")}</button>
                : <button type="button" className="bd-choice bd-choice-main" onClick={onClose}>{t("buddy.done")}</button>)}
              <button type="button" className="bd-choice" onClick={restart}>{t("buddy.again")}</button>
              {onBrowse && <button type="button" className="bd-choice" onClick={onBrowse}>{t("emo.noneFit")}</button>}
            </div>
          )}
          {phase === "write" && (
            <div className={`bd-write${done ? " on" : ""}`}>
              <textarea className="bd-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={4} placeholder={t("buddy.notePh")} aria-label={t("buddy.notePh")} />
              <div className="bd-choices bd-choices-row on">
                <button type="button" className="bd-choice bd-choice-main" onClick={() => goPhase("ask")} disabled={!note.trim()}>{t("buddy.noteDone")}</button>
                <button type="button" className="bd-choice" onClick={() => { setNote(""); goPhase("ask"); }}>{t("buddy.noteSkip")}</button>
              </div>
            </div>
          )}
          {phase === "ask" && (
            <div className={`bd-choices bd-choices-row${done ? " on" : ""}`} key="c-ask">
              <button type="button" className="bd-choice bd-choice-main" onClick={doSave} disabled={saving}>{t(save?.signedIn ? "buddy.saveYes" : "buddy.saveYesGuest")}</button>
              <button type="button" className="bd-choice" onClick={() => goPhase("declined")}>{t("buddy.saveNo")}</button>
            </div>
          )}
          {phase === "declined" && (
            <div className={`bd-choices bd-choices-row${done ? " on" : ""}`} key="c-declined">
              <button type="button" className="bd-choice" onClick={restart}>{t("buddy.again")}</button>
              <button type="button" className="bd-choice" onClick={onClose}>{t("buddy.leave")}</button>
            </div>
          )}
          {saved !== null && (
            <div className={`bd-choices bd-choices-row${done ? " on" : ""}`} key={`c-saved-${saved === "error" ? "e" : "ok"}`}>
              {saved === "error"
                ? <button type="button" className="bd-choice bd-choice-main" onClick={doSave} disabled={saving}>{t("buddy.saveRetry")}</button>
                : <a className="bd-choice bd-choice-main" href="/?open=diary">{t("buddy.openDiary")}</a>}
              <button type="button" className="bd-choice" onClick={restart}>{t("buddy.again")}</button>
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
