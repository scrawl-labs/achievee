/**
 * Pixel art for the diary's "talk with Bori" scene: an original little cat and a city subway car,
 * drawn pixel by pixel at a low resolution and scaled up with nearest-neighbour.
 */

export type Face = "idle" | "happy" | "sad" | "think" | "joy";
type Grid = (string | null)[][];

const K = "#3d2c3e"; // outline
const FUR = "#fffaf2";
const FUR_SH = "#eadfd2";
const FUR_LINE = "#d6c6b6";
const PINK = "#ffb1bb";
const NOSE = "#ff8fa3";
const SCARF = "#ff9f43";
const SCARF_SH = "#e07b22";
const SCARF_HI = "#ffc27a";
const MOUTH = "#7a2f45";
const TEAR = "#7cc8ff";
const WHITE = "#ffffff";
const BROW = "#a88a78";

export const CAT_W = 44;
export const CAT_H = 46;

function grid(w: number, h: number): Grid { return Array.from({ length: h }, () => Array<string | null>(w).fill(null)); }
const inEll = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
function sign(px: number, py: number, ax: number, ay: number, bx: number, by: number) { return (px - bx) * (ay - by) - (ax - bx) * (py - by); }
function inTri(x: number, y: number, a: number[], b: number[], c: number[]) {
  const px = x + 0.5, py = y + 0.5;
  const d1 = sign(px, py, a[0], a[1], b[0], b[1]), d2 = sign(px, py, b[0], b[1], c[0], c[1]), d3 = sign(px, py, c[0], c[1], a[0], a[1]);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function ell(g: Grid, cx: number, cy: number, rx: number, ry: number, col: string, shade?: string) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (!inEll(x, y, cx, cy, rx, ry)) continue;
    // light comes from the upper left: pixels that fall outside a copy nudged up-left are in shadow
    g[y][x] = shade && !inEll(x, y, cx - 1.6, cy - 1.8, rx, ry) ? shade : col;
  }
}
function tri(g: Grid, a: number[], b: number[], c: number[], col: string) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) if (inTri(x, y, a, b, c)) g[y][x] = col;
}
function px(g: Grid, pts: number[][], col: string) { for (const [x, y] of pts) if (g[y] && x >= 0 && x < g[0].length) g[y][x] = col; }
function rect(g: Grid, x0: number, y0: number, w: number, h: number, col: string) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g[y] && x >= 0 && x < g[0].length) g[y][x] = col;
}
/** A soft inner line where a front part (an ellipse) overlaps what is behind it. */
function crease(g: Grid, cx: number, cy: number, rx: number, ry: number, col: string, onlyBelow = -1) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (!inEll(x, y, cx, cy, rx, ry) || y < onlyBelow) continue;
    const edge = !inEll(x, y - 1, cx, cy, rx, ry) || !inEll(x - 1, y, cx, cy, rx, ry) || !inEll(x + 1, y, cx, cy, rx, ry);
    if (edge && g[y][x] !== null) g[y][x] = col;
  }
}
/** Pixel-art outline: every empty pixel touching a filled one becomes the outline colour. */
function outline(g: Grid, col = K) {
  const h = g.length, w = g[0].length;
  const out = g.map((r) => r.slice());
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y][x] !== null) continue;
    if ((g[y - 1]?.[x] ?? null) !== null || (g[y + 1]?.[x] ?? null) !== null || (g[y][x - 1] ?? null) !== null || (g[y][x + 1] ?? null) !== null) out[y][x] = col;
  }
  return out;
}

export type CatPose = { face: Face; blink: boolean; talk: boolean; tail: number };

/** Bori, a small white cat with an orange scarf, sitting. 44×46 pixels. */
export function catGrid({ face, blink, talk, tail }: CatPose): Grid {
  let g = grid(CAT_W, CAT_H);
  const sad = face === "sad", happy = face === "happy" || face === "joy";

  // tail, curling up beside the body (behind it)
  const tailPts = [[30, 42], [31, 42], [32, 42], [33, 42], [34, 41], [35, 41], [36, 40], [37, 39], [37, 38], [38, 37], [38, 36], [38, 35]];
  const tip = tail === 0 ? [[38, 34], [38, 33], [37, 32]] : tail === 1 ? [[39, 34], [39, 33], [40, 32]] : [[37, 34], [36, 33], [36, 32]];
  for (const [x, y] of [...tailPts, ...tip]) { px(g, [[x, y], [x, y + 1], [x - 1, y]], FUR); }
  px(g, [[tip[2][0], tip[2][1]], [tip[1][0], tip[1][1]]], FUR_SH);

  // body
  ell(g, 22, 35.5, 11, 9.5, FUR, FUR_SH);

  // ears (behind the head)
  if (sad) {
    tri(g, [3, 15], [10, 9], [18, 13], FUR); tri(g, [6, 14], [10, 11], [15, 13], PINK);
    tri(g, [41, 15], [34, 9], [26, 13], FUR); tri(g, [38, 14], [34, 11], [29, 13], PINK);
  } else {
    tri(g, [8, 13], [10, 1.5], [19, 8], FUR); tri(g, [10.5, 10.5], [11.2, 5], [16, 8.5], PINK);
    tri(g, [36, 13], [34, 1.5], [25, 8], FUR); tri(g, [33.5, 10.5], [32.8, 5], [28, 8.5], PINK);
  }

  // head
  ell(g, 22, 17.5, 14, 11, FUR, FUR_SH);

  // scarf around the neck, with a tail hanging down
  for (let y = 27; y <= 30; y++) for (let x = 11; x <= 33; x++) {
    if ((y === 27 || y === 30) && (x === 11 || x === 33)) continue;
    g[y][x] = y === 27 ? SCARF_HI : y === 30 ? SCARF_SH : SCARF;
  }
  rect(g, 27, 30, 4, 6, SCARF); rect(g, 30, 30, 1, 6, SCARF_SH); px(g, [[27, 35], [29, 35]], SCARF_SH); px(g, [[28, 36], [30, 36]], SCARF_SH);
  px(g, [[26, 28], [26, 29]], SCARF_SH);

  // paws: on the lap, or up in the air when cheering
  if (face === "joy") {
    ell(g, 6.5, 22, 3.6, 3.6, FUR); ell(g, 37.5, 22, 3.6, 3.6, FUR);
    px(g, [[5, 23], [7, 23], [36, 23], [38, 23]], FUR_LINE);
  } else {
    ell(g, 17, 40.5, 3.6, 2.8, FUR); ell(g, 27, 40.5, 3.6, 2.8, FUR);
    crease(g, 17, 40.5, 3.6, 2.8, FUR_LINE, 39); crease(g, 27, 40.5, 3.6, 2.8, FUR_LINE, 39);
    px(g, [[16, 42], [18, 42], [26, 42], [28, 42]], FUR_LINE);
  }
  // a little forehead tuft
  px(g, [[21, 6], [22, 6], [22, 5]], FUR);

  g = outline(g);

  // ---- face (drawn after the outline so it sits inside) ----
  const L = 15, R = 28, EY = 17; // eye columns (left pixel) and top row
  if (happy) {
    px(g, [[L - 1, EY + 2], [L, EY + 1], [L + 1, EY + 1], [L + 2, EY + 2]], K);
    px(g, [[R - 1, EY + 2], [R, EY + 1], [R + 1, EY + 1], [R + 2, EY + 2]], K);
  } else if (blink) {
    rect(g, L - 1, EY + 2, 4, 1, K); rect(g, R - 1, EY + 2, 4, 1, K);
  } else if (sad) {
    rect(g, L, EY + 1, 2, 3, K); px(g, [[L, EY + 1]], WHITE);
    rect(g, R, EY + 1, 2, 3, K); px(g, [[R, EY + 1]], WHITE);
    px(g, [[L - 2, EY - 1], [L - 1, EY - 1], [L, EY - 2], [L + 1, EY - 2]], BROW);
    px(g, [[R, EY - 2], [R + 1, EY - 2], [R + 2, EY - 1], [R + 3, EY - 1]], BROW);
  } else if (face === "think") {
    rect(g, L, EY - 1, 2, 3, K); px(g, [[L + 1, EY - 1]], WHITE);
    rect(g, R, EY - 1, 2, 3, K); px(g, [[R + 1, EY - 1]], WHITE);
    px(g, [[R - 1, EY - 4], [R, EY - 5], [R + 1, EY - 5], [R + 2, EY - 4]], BROW);
  } else {
    rect(g, L, EY, 2, 4, K); px(g, [[L, EY]], WHITE);
    rect(g, R, EY, 2, 4, K); px(g, [[R, EY]], WHITE);
  }
  // cheeks
  const blush = sad ? [] : [[L - 3, EY + 5], [L - 2, EY + 5], [R + 3, EY + 5], [R + 4, EY + 5]];
  px(g, blush, PINK);
  if (happy) px(g, [[L - 3, EY + 4], [R + 4, EY + 4]], "#ffd0d6");
  // nose and mouth
  px(g, [[21, EY + 3], [22, EY + 3]], NOSE);
  if (talk || face === "joy") {
    px(g, [[20, EY + 4], [23, EY + 4]], K);
    rect(g, 20, EY + 5, 4, 1, MOUTH); rect(g, 21, EY + 6, 2, 1, PINK);
    px(g, [[20, EY + 6], [23, EY + 6]], K); px(g, [[21, EY + 7], [22, EY + 7]], K);
  } else if (sad) {
    px(g, [[20, EY + 6], [21, EY + 5], [22, EY + 5], [23, EY + 6]], K);
  } else {
    px(g, [[20, EY + 4], [23, EY + 4], [21, EY + 5], [22, EY + 5]], K);
  }
  if (sad) px(g, [[L - 1, EY + 4], [L - 1, EY + 5]], TEAR);
  return g;
}

/* ---------- emotes above the head (tiny hand-drawn sprites) ---------- */
const EMOTE_PAL: Record<string, string> = { K, O: "#ff9f43", Y: "#ffd23f", B: TEAR, H: WHITE, W: "#fff6c8", P: "#ff6f91" };
const EMOTES: Record<string, string[]> = {
  note: ["..KKKKK", "..KOOOK", "..KOKKK", "..KOK..", "..KOK..", "KKKOK..", "KOOOK..", "KOOOK..", "KKKKK.."],
  drop: ["...K...", "..KBK..", "..KBK..", ".KBBBK.", "KBHBBBK", "KBHBBBK", "KBBBBBK", ".KBBBK.", "..KKK.."],
  q: [".KKKKK.", "KOOOOOK", "KOKKKOK", "KKK.KOK", "...KOOK", "..KOKK.", "..KKK..", "..KOK..", "..KKK.."],
  spark: ["....K....", "...KYK...", "...KYK...", ".KKYYYKK.", "KYYYWYYYK", ".KKYYYKK.", "...KYK...", "...KYK...", "....K...."],
  heart: [".KK.KK.", "KPPKPPK", "KPHPPPK", "KPPPPPK", ".KPPPK.", "..KPK..", "...K..."],
};
export type Emote = keyof typeof EMOTES;
export function emoteGrid(e: Emote): Grid { return EMOTES[e].map((r) => [...r].map((c) => (c === "." ? null : EMOTE_PAL[c]))); }

/* ---------- turning grids into canvases ---------- */
const cache = new Map<string, HTMLCanvasElement>();
export function toCanvas(key: string, make: () => Grid): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const g = make();
  const c = document.createElement("canvas");
  c.width = g[0].length; c.height = g.length;
  const ctx = c.getContext("2d")!;
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    const col = g[y][x];
    if (col) { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); }
  }
  cache.set(key, c);
  return c;
}
export const catCanvas = (p: CatPose) => toCanvas(`cat:${p.face}:${+p.blink}:${+p.talk}:${p.tail}`, () => catGrid(p));
export const emoteCanvas = (e: Emote) => toCanvas(`emote:${e}`, () => emoteGrid(e));

/* ---------- the subway car ---------- */
function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

type Theme = {
  sky: string[]; far: string; farWin: string[]; near: string; nearWin: string[]; neon: string[]; orb: string; orbGlow: string;
  wall: string; wallSh: string; wallHi: string; frame: string; frameSh: string; ceil: string; lamp: string;
  seat: string; seatSh: string; seatHi: string; seatFront: string; under: string; underSh: string; floor: string; floorHi: string;
  pole: string; poleSh: string; poleHi: string; strap: string; strapSh: string; glass: string; tint: string | null;
};
export const THEMES: Record<"dusk" | "night", Theme> = {
  dusk: {
    sky: ["#5e6bc4", "#8b7fd0", "#c48ccf", "#f3a2a6", "#ffc48f", "#ffe0a3"], far: "#9a86c2", farWin: ["#ffe9b0", "#ffd28a"], near: "#6a5996", nearWin: ["#ffe08a", "#fff1c4"],
    neon: ["#ff7eb6", "#7ee8ff", "#ffe066"], orb: "#fff1b8", orbGlow: "#ffd59a",
    wall: "#efece3", wallSh: "#dcd8cc", wallHi: "#fbfaf5", frame: "#b8bec6", frameSh: "#8e959f", ceil: "#f7f5ee", lamp: "#fffbe6",
    seat: "#3fa79f", seatSh: "#2f8780", seatHi: "#74cdc4", seatFront: "#2a746e", under: "#9aa0a8", underSh: "#7d838c", floor: "#b3ada3", floorHi: "#c7c2b8",
    pole: "#f5c534", poleSh: "#c99a12", poleHi: "#ffe58a", strap: "#f4f1ea", strapSh: "#b9b4aa", glass: "rgba(255,255,255,.22)", tint: null,
  },
  night: {
    sky: ["#0f1433", "#161c44", "#1f2657", "#2b316a", "#3a3b78", "#4b4483"], far: "#2b2f63", farWin: ["#ffd36b", "#8fdcff"], near: "#1a1d45", nearWin: ["#ffd36b", "#fff3c2"],
    neon: ["#ff5fa8", "#45e0ff", "#b7ff5a"], orb: "#fff6d8", orbGlow: "#8f8ac9",
    wall: "#e6e5df", wallSh: "#cfcdc6", wallHi: "#f6f5f0", frame: "#a7aeb8", frameSh: "#7b838e", ceil: "#efeee8", lamp: "#fffbe0",
    seat: "#3a9a93", seatSh: "#2b7a74", seatHi: "#66bdb4", seatFront: "#246a65", under: "#8b9199", underSh: "#6f757e", floor: "#a19b92", floorHi: "#b6b0a6",
    pole: "#f0bf2e", poleSh: "#c2930f", poleHi: "#ffe07a", strap: "#efece4", strapSh: "#aaa59b", glass: "rgba(200,220,255,.14)", tint: "rgba(30,25,70,.10)",
  },
};

/** A strip of skyline that repeats sideways. */
export function skyline(kind: "far" | "near", h: number, th: Theme, seed: number) {
  const W = kind === "far" ? 256 : 320;
  const c = document.createElement("canvas");
  c.width = W; c.height = h;
  const g = c.getContext("2d")!;
  const r = rng(seed);
  let x = 0;
  while (x < W) {
    const bw = kind === "far" ? 10 + Math.floor(r() * 16) : 14 + Math.floor(r() * 22);
    const bh = Math.floor(h * (kind === "far" ? 0.35 + r() * 0.4 : 0.22 + r() * 0.42));
    const top = h - bh;
    const w = Math.min(bw, W - x);
    g.fillStyle = kind === "far" ? th.far : th.near;
    g.fillRect(x, top, w, bh);
    // roof details
    if (r() < 0.35 && w > 6) { g.fillRect(x + 2, top - 3, 2, 3); g.fillRect(x + 1, top - 4, 4, 1); }
    if (kind === "near" && r() < 0.3 && w > 10) { g.fillRect(x + Math.floor(w / 2) - 3, top - 5, 6, 5); }
    // windows
    const wins = kind === "far" ? th.farWin : th.nearWin;
    for (let wy = top + 3; wy < h - 2; wy += kind === "far" ? 3 : 4) {
      for (let wx = x + 2; wx < x + w - 2; wx += kind === "far" ? 3 : 4) {
        if (r() < (kind === "far" ? 0.28 : 0.42)) {
          g.fillStyle = wins[Math.floor(r() * wins.length)];
          g.fillRect(wx, wy, kind === "far" ? 1 : 2, kind === "far" ? 1 : 2);
        }
      }
    }
    // a neon sign now and then
    if (kind === "near" && r() < 0.28 && w > 12 && bh > 18) {
      g.fillStyle = th.neon[Math.floor(r() * th.neon.length)];
      const sy = top + 4 + Math.floor(r() * 6);
      g.fillRect(x + 3, sy, w - 6, 3);
      g.fillStyle = "rgba(0,0,0,.35)";
      for (let k = x + 4; k < x + w - 4; k += 3) g.fillRect(k, sy + 1, 1, 1);
    }
    x += w + (kind === "far" ? (r() < 0.3 ? 2 : 0) : (r() < 0.4 ? 3 + Math.floor(r() * 4) : 0));
  }
  return c;
}
