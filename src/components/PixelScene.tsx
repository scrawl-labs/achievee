"use client";
import { useEffect, useRef } from "react";
import { CAT_H, CAT_W, type Emote, type Face, THEMES, catCanvas, emoteCanvas, skyline } from "@/lib/pixelArt";

type Props = { face: Face; talking: boolean; beat: number; night: boolean };

/**
 * A city subway car at dusk (or at night in dark mode), drawn at a low resolution and scaled up pixel-perfect.
 * The city slides past the windows, the straps sway, the car bumps now and then, and Bori sits on the bench.
 */
export default function PixelScene({ face, talking, beat, night }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const state = useRef({ face, talking, beat });
  state.current = { face, talking, beat };

  useEffect(() => {
    const el = host.current!, c = cvs.current!;
    const ctx = c.getContext("2d")!;
    const th = THEMES[night ? "night" : "dusk"];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, S = 3;
    let L = { ceil: 0, ads: 0, winTop: 0, winBot: 0, seatTop: 0, seatY: 0, floorY: 0, catX: 0, catY: 0, pillars: [] as number[], poles: [] as number[], straps: [] as number[] };
    let far: HTMLCanvasElement, near: HTMLCanvasElement, sky: HTMLCanvasElement;

    const layout = () => {
      const w = el.clientWidth, h = el.clientHeight;
      S = Math.max(3, Math.min(Math.floor(w / 112), Math.round(h / 160)));
      W = Math.ceil(w / S); H = Math.ceil(h / S);
      c.width = W; c.height = H;
      c.style.width = `${W * S}px`; c.style.height = `${H * S}px`;
      const portrait = w / h < 0.8;
      const ceil = 7, ads = 13;
      const seatY = Math.round(H * (portrait ? 0.44 : 0.57));
      const seatTop = seatY - 15;
      const winTop = ceil + ads + 3, winBot = seatTop - 4;
      const cx = Math.round(W / 2);
      // window pillars: one window centred behind Bori
      const pillars: number[] = [];
      for (let x = cx - 50; x > -60; x -= 100) pillars.push(x);
      for (let x = cx + 50; x < W + 60; x += 100) pillars.push(x);
      const poles = portrait ? [] : [cx - 92, cx + 92].filter((x) => x > 6 && x < W - 6);
      const straps: number[] = [];
      for (let x = cx - 200; x < W + 20; x += 20) if (Math.abs(x - cx) > 8) straps.push(x);
      L = { ceil, ads, winTop, winBot, seatTop, seatY, floorY: seatY + 22, catX: cx - Math.floor(CAT_W / 2), catY: seatY - CAT_H + 3, pillars, poles, straps };
      const wh = winBot - winTop;
      far = skyline("far", wh, th, 11);
      sky = paintSky(W, wh);
      near = skyline("near", wh, th, 29);
    };
    /** The sky with its sun or moon never changes, so it is painted once per size. */
    function paintSky(w: number, h: number) {
      const k = document.createElement("canvas");
      k.width = w; k.height = h;
      const g = k.getContext("2d")!;
      const bands = th.sky;
      for (let y = 0; y < h; y++) {
        const f = (y / h) * (bands.length - 1);
        const i = Math.floor(f), frac = f - i;
        for (let x = 0; x < w; x++) {
          // ordered dithering between bands for that pixel-art gradient
          const d = [0, 0.5, 0.75, 0.25][(x & 1) + 2 * (y & 1)];
          g.fillStyle = bands[Math.min(bands.length - 1, frac > d ? i + 1 : i)];
          g.fillRect(x, y, 1, 1);
        }
      }
      const ox = Math.round(w * 0.7), oy = Math.round(h * (night ? 0.24 : 0.36)), r = night ? 6 : 9;
      for (let y = -r - 4; y <= r + 4; y++) for (let x = -r - 4; x <= r + 4; x++) {
        const d = Math.sqrt(x * x + y * y);
        g.fillStyle = d <= r ? th.orb : th.orbGlow;
        if (d <= r || (d <= r + 3 && (x + y) % 2 === 0)) g.fillRect(ox + x, oy + y, 1, 1);
      }
      if (night) { g.fillStyle = "#e3dcbc"; g.fillRect(ox + 1, oy - 2, 2, 2); g.fillRect(ox - 3, oy + 2, 1, 1); g.fillRect(ox + 2, oy + 3, 1, 1); }
      if (night) for (let n = 0; n < 40; n++) { g.fillStyle = n % 3 ? "#cfd6ff" : "#fff6c8"; g.fillRect((n * 53) % w, (n * 29) % Math.round(h * 0.55), 1, 1); }
      return k;
    }
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(el);

    const R = (x: number, y: number, w: number, h: number, col: string) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    const line = (x0: number, y0: number, x1: number, y1: number, col: string) => {
      ctx.fillStyle = col;
      let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
      for (;;) { ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    };

    const start = performance.now();
    let last = 0, raf = 0, running = true;
    let lastBeat = state.current.beat, hopAt = -9, emoteAt = 0, lastEmote = "";
    let nextBlink = 2.2, blinkUntil = 0, nextBump = 1.8, bumpAt = -9;

    const draw = (t: number) => {
      const st = state.current;
      if (st.beat !== lastBeat) { lastBeat = st.beat; hopAt = t; }
      if (t > nextBump) { bumpAt = t; nextBump = t + 1.6 + Math.random() * 2.4; }
      const bump = t - bumpAt < 0.09 ? 1 : 0;            // the car jolts over a rail joint
      const catBump = t - bumpAt > 0.05 && t - bumpAt < 0.16 ? 1 : 0;
      if (t > nextBlink) { blinkUntil = t + 0.13; nextBlink = t + 2.4 + Math.random() * 3; }

      const { ceil, ads, winTop, winBot, seatTop, seatY, floorY, pillars, poles, straps } = L;
      const wh = winBot - winTop;

      // ---- outside: sky, sun or moon, two layers of city ----
      ctx.drawImage(sky, 0, winTop);
      const farX = Math.floor((reduce ? 0 : t * 7) % far.width), nearX = Math.floor((reduce ? 0 : t * 26) % near.width);
      for (let x = -farX; x < W; x += far.width) ctx.drawImage(far, x, winTop);
      for (let x = -nearX; x < W; x += near.width) ctx.drawImage(near, x, winTop);
      // a catenary pole whips past now and then
      const pp = (t * 210) % 520;
      if (!reduce && pp < W + 10) { R(Math.round(W + 4 - pp), winTop, 2, wh, night ? "#0b0d22" : "#4a3f6e"); R(Math.round(W + 4 - pp) - 5, winTop + 4, 12, 1, night ? "#0b0d22" : "#4a3f6e"); }

      // ---- the car (shifts a pixel when it bumps) ----
      ctx.save();
      ctx.translate(0, bump);
      // ceiling, lights, handrail
      R(0, -1, W, ceil + 1, th.ceil);
      for (let x = (Math.round(W / 2) % 40) - 40; x < W; x += 40) R(x + 6, 1, 28, 2, th.lamp);
      R(0, ceil - 1, W, 1, th.wallSh);
      // advert strip
      R(0, ceil, W, ads, th.wall);
      const adCols = ["#ffd6e0", "#d4f0ff", "#fff1b8", "#dff5d8", "#e8dcff"];
      let ai = 0;
      for (let x = (Math.round(W / 2) % 50) - 50 + 4; x < W; x += 50, ai++) {
        R(x, ceil + 2, 42, ads - 4, th.frameSh);
        R(x + 1, ceil + 3, 40, ads - 6, adCols[(ai + 5) % adCols.length]);
        R(x + 4, ceil + 5, 14, 1, "#8b8597"); R(x + 4, ceil + 7, 20, 1, "#b7b1c2");
        R(x + 30, ceil + 4, 6, 5, ["#ff9f43", "#3fa79f", "#ff7eb6", "#7c8cff", "#f5c534"][ai % 5]);
      }
      R(0, ceil + ads - 1, W, 1, th.wallSh);
      // handrail
      R(0, ceil + ads + 1, W, 1, th.frame);
      // wall around the windows
      R(0, ceil + ads, W, 3, th.wall);
      R(0, winBot, W, seatTop - winBot, th.wall);
      R(0, winBot, W, 1, th.wallSh);
      R(0, winBot + 1, W, 1, th.wallHi);
      // window frames and pillars
      R(0, winTop - 1, W, 1, th.frame); R(0, winBot - 1, W, 1, th.frame);
      for (const px of pillars) {
        R(px - 5, winTop - 1, 10, wh + 1, th.wall);
        R(px - 6, winTop - 1, 1, wh + 1, th.frame); R(px + 5, winTop - 1, 1, wh + 1, th.frameSh);
        R(px - 3, winTop + 4, 6, 10, th.wallSh); R(px - 2, winTop + 5, 4, 2, "#5aa8e6"); R(px - 2, winTop + 8, 4, 1, "#9aa0a8"); R(px - 2, winTop + 10, 3, 1, "#9aa0a8");
        // rounded window corners
        for (const [dx, dy] of [[-7, 0], [-8, 0], [-7, 1], [6, 0], [7, 0], [6, 1], [-7, wh - 2], [-8, wh - 2], [-7, wh - 3], [6, wh - 2], [7, wh - 2], [6, wh - 3]]) R(px + dx, winTop + dy, 1, 1, th.frame);
      }
      // glass glints
      for (const px of pillars) {
        const gx = px + 14;
        ctx.fillStyle = th.glass;
        for (let k = 0; k < 10; k++) { ctx.fillRect(gx + k, winTop + 10 - k + 6, 1, 1); ctx.fillRect(gx + k + 4, winTop + 10 - k + 6, 2, 1); }
      }
      // bench: backrest, cushion with seat dividers, front, heater below
      R(0, seatTop, W, seatY - seatTop, th.seat);
      R(0, seatTop, W, 1, th.seatHi);
      for (let x = (Math.round(W / 2) % 22) - 11; x < W; x += 22) { R(x, seatTop + 2, 1, seatY - seatTop - 3, th.seatSh); }
      R(0, seatY - 1, W, 1, th.seatSh);
      R(0, seatY, W, 3, th.seatHi);
      R(0, seatY + 3, W, 4, th.seatFront);
      R(0, seatY + 7, W, floorY - seatY - 7, th.under);
      for (let x = 2; x < W; x += 4) R(x, seatY + 11, 2, 1, th.underSh);
      for (let x = 0; x < W; x += 4) R(x, seatY + 14, 2, 1, th.underSh);
      R(0, floorY - 2, W, 2, "rgba(0,0,0,.18)");
      // floor
      R(0, floorY, W, H - floorY + 2, th.floor);
      R(0, floorY, W, 1, th.floorHi);
      for (let y = floorY + 3; y < H; y += 5) for (let x = (y * 7) % 9; x < W; x += 9) R(x, y, 1, 1, th.floorHi);

      // Bori's paper bag on the bench
      const bx = L.catX + CAT_W + 1, by = seatY - 13;
      R(bx + 3, by - 6, 3, 8, "#e0a458"); R(bx + 3, by - 6, 1, 8, "#c9853b"); R(bx + 4, by - 7, 2, 1, "#e0a458"); // a baguette
      R(bx, by, 11, 14, "#3d2c3e"); R(bx + 1, by + 1, 9, 12, "#d9b57d"); R(bx + 1, by + 1, 9, 2, "#e8c995"); R(bx + 8, by + 3, 2, 10, "#c79c5f");
      R(bx + 3, by + 6, 4, 3, "#ff9f43");

      // poles
      for (const p of poles) {
        R(p - 1, ceil + ads + 1, 3, H, th.pole); R(p - 1, ceil + ads + 1, 1, H, th.poleHi); R(p + 1, ceil + ads + 1, 1, H, th.poleSh);
      }

      // Bori: hop on a new line, a soft breathing bob, a jolt with the car
      const ht = t - hopAt;
      const hop = !reduce && ht < 0.4 ? Math.round(Math.sin((ht / 0.4) * Math.PI) * 4) : 0;
      const breathe = reduce ? 0 : (Math.sin(t * 2.2) > 0.6 ? 1 : 0);
      const tail = reduce ? 0 : Math.floor(t * 1.4) % 4 === 3 ? (Math.floor(t * 6) % 2 ? 1 : 2) : 0;
      const talkFrame = st.talking && !reduce ? Math.floor(t * 9) % 2 === 0 : false;
      const cat = catCanvas({ face: st.face, blink: t < blinkUntil && st.face !== "happy" && st.face !== "joy", talk: talkFrame, tail });
      const cy = L.catY - hop + catBump - (st.face === "joy" && !reduce ? (Math.floor(t * 5) % 2) : 0);
      // a soft shadow on the cushion
      ctx.fillStyle = "rgba(0,0,0,.14)";
      ctx.fillRect(L.catX + 9 + Math.floor(hop / 2), seatY + 1, CAT_W - 18 - hop, 2);
      ctx.drawImage(cat, L.catX, cy + (breathe && !hop ? 1 : 0));

      // emote above the head
      const kind: Emote | "" = st.face === "happy" ? "note" : st.face === "sad" ? "drop" : st.face === "think" ? "q" : st.face === "joy" ? "spark" : "";
      if (kind + st.beat !== lastEmote) { lastEmote = kind + st.beat; emoteAt = t; }
      if (kind) {
        const e = emoteCanvas(kind);
        const et = t - emoteAt;
        if (et > 0.15) {
          const float = reduce ? 0 : Math.round(Math.sin(t * 3) * 1);
          const pop = et < 0.3 ? -2 : 0;
          ctx.drawImage(e, L.catX + CAT_W - 6, cy - 4 + float + pop);
          if (kind === "spark" && Math.floor(t * 4) % 2) ctx.drawImage(emoteCanvas("heart"), L.catX - 2, cy + 2 + float);
        }
      }

      // hanging straps sway with the train
      const sway = reduce ? 0 : Math.sin(t * 1.7) * 1.6 + (t - bumpAt < 0.5 ? Math.sin((t - bumpAt) * 18) * (1 - (t - bumpAt) * 2) * 2 : 0);
      for (const sx of straps) {
        const top = ceil + ads + 1, len = 9;
        const ex = Math.round(sx + sway), ey = top + len;
        line(sx, top, ex, ey - 1, th.strapSh);
        // a hollow ring: light on top, shaded underneath
        R(ex - 1, ey, 3, 1, th.strap); R(ex - 2, ey + 1, 1, 4, th.strap); R(ex + 2, ey + 1, 1, 4, th.strapSh);
        R(ex - 1, ey + 5, 3, 1, th.strapSh); R(ex - 3, ey + 2, 1, 2, th.strapSh); R(ex + 3, ey + 2, 1, 2, th.strapSh);
      }
      ctx.restore();

      if (th.tint) { ctx.fillStyle = th.tint; ctx.fillRect(0, 0, W, H); }
    };

    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 1000 / 30) return; // 30 fps is plenty for pixel art and kinder to batteries
      last = now;
      draw((now - start) / 1000);
    };
    raf = requestAnimationFrame(frame);
    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; raf = requestAnimationFrame(frame); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { running = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [night]);

  return <div ref={host} className="bdg-canvas" aria-hidden="true"><canvas ref={cvs} /></div>;
}
