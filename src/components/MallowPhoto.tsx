"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MALLOW_FACES, MALLOW_VIEWS, type MallowFace, type MallowPlace, type MallowView, mallowSrc } from "@/lib/mallowScene";

export type Face = "idle" | "happy" | "sad" | "think" | "joy";
type Props = { place: MallowPlace; face: Face; talking: boolean; beat: number; onReady?: () => void };

/** Which picture fits the screen: the tall one on phones held upright, the wide one elsewhere. */
function useView(el: React.RefObject<HTMLDivElement>) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const read = () => setBox({ w: node.clientWidth, h: node.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(node);
    return () => ro.disconnect();
  }, [el]);
  const view: MallowView = box.w && box.w / box.h < 0.9 ? "tall" : "wide";
  return { box, view };
}

/** The face picture to show: blinking now and then, mouth moving while Mallow talks. */
function useFaceFrame(face: Face, talking: boolean): MallowFace {
  const [tick, setTick] = useState(0);
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!talking) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 150);
    return () => window.clearInterval(id);
  }, [talking]);
  useEffect(() => {
    let t: number;
    const next = () => { t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 140); next(); }, 2600 + Math.random() * 3000); };
    next();
    return () => window.clearTimeout(t);
  }, []);
  const open = talking && tick % 2 === 1;
  if (face === "happy") return open ? "joy" : "happy";
  if (face === "joy") return "joy";
  if (face === "idle") return open ? "talk" : blink ? "blink" : "idle";
  return face; // sad, think: their own face, holding still
}

const EMOTE: Partial<Record<Face, JSX.Element>> = {
  happy: <path d="M9 18a3 3 0 1 1-2-2.8V5l10-2v11a3 3 0 1 1-2-2.8V6.6l-6 1.2z" fill="#f49a3d" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />,
  sad: <path d="M12 3c3.2 4.4 5 7.2 5 9.6a5 5 0 0 1-10 0C7 10.2 8.8 7.4 12 3z" fill="#8cc8f4" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />,
  think: <text x="12" y="18" textAnchor="middle" fontSize="18" fontWeight="900" fill="#f49a3d" stroke="#fff" strokeWidth="1.6" paintOrder="stroke">?</text>,
  joy: <><path d="M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6z" fill="#ffd23f" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /><path d="M18 12l.9 2.1L21 15l-2.1.9L18 18l-.9-2.1L15 15l2.1-.9z" fill="#ffd23f" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" /></>,
};
const FEELING_COLOURS = ["#ffc46b", "#ff9e8a", "#8fe3c0", "#c3a6ff", "#8fc8ff", "#ffe39a"];

/**
 * Mallow in the meadow at dawn: a picture rendered ahead of time (path traced), with the face area swapped for each
 * expression, an emote popping up on each new line, and little feelings drifting up out of the jar. No 3D on the device.
 */
export default function MallowPhoto({ place, face, talking, beat, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const { box, view } = useView(host);
  const v = MALLOW_VIEWS[view];
  const frame = useFaceFrame(face, talking);

  // cover the screen with the picture, centred, keeping its shape
  const scale = box.w ? Math.max(box.w / v.w, box.h / v.h) : 0;
  const pw = v.w * scale, ph = v.h * scale;
  const pct = (x: number, y: number) => ({ left: `${(x / v.w) * 100}%`, top: `${(y / v.h) * 100}%` });
  const [fx0, fy0, fx1, fy1] = v.face;

  // ready once the picture and every face for this view have loaded, so nothing pops in afterwards
  const readyFor = useRef<string | null>(null);
  useEffect(() => {
    const key = `${place}/${view}`;
    if (!box.w || readyFor.current === key) return;
    let live = true;
    const srcs = [mallowSrc(place, view, "base"), ...MALLOW_FACES.map((f) => mallowSrc(place, view, f))];
    Promise.all(srcs.map((s) => { const i = new Image(); i.src = s; return i.decode().catch(() => undefined); }))
      .then(() => { if (live) { readyFor.current = key; onReady?.(); } });
    return () => { live = false; };
  }, [box.w, view, place, onReady]);

  return (
    <div ref={host} className="mp" aria-hidden="true">
      {scale > 0 && (
        <div className="mp-pic" style={{ width: pw, height: ph, left: (box.w - pw) / 2, top: (box.h - ph) / 2 }}>
          <img className="mp-base" src={mallowSrc(place, view, "base")} alt="" draggable={false} />
          {MALLOW_FACES.map((f) => (
            <img key={f} className={`mp-face${f === frame ? " on" : ""}`} src={mallowSrc(place, view, f)} alt="" draggable={false}
              style={{ ...pct(fx0, fy0), width: `${((fx1 - fx0) / v.w) * 100}%`, height: `${((fy1 - fy0) / v.h) * 100}%` }} />
          ))}
          <div className="mp-feelings" style={pct(v.jar[0], v.jar[1])}>
            {FEELING_COLOURS.map((c, i) => {
              // out to the sides as they rise, so they never cross Mallow's face
              const side = i % 2 ? 1 : -1;
              return <i key={i} style={{ background: c, color: c, animationDelay: `${i * 1.15}s`, ["--dx" as string]: `${side * (0.55 + (i % 3) * 0.12) * ph * 0.3}px`, ["--dy" as string]: `${-(0.22 + (i % 3) * 0.05) * ph}px` }} />;
            })}
          </div>
          {place === "rain" && <div className="mp-rain" />}
          {EMOTE[face] && (
            <svg key={`${face}-${beat}`} className="mp-emote" viewBox="0 0 24 24" style={{ ...pct(v.head[0], v.head[1]), width: ph * 0.07, height: ph * 0.07 }}>{EMOTE[face]}</svg>
          )}
        </div>
      )}
    </div>
  );
}
