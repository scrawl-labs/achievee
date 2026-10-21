/**
 * The "This month, as me" picture: a 1080x1350 card drawn on a canvas in the browser, so nothing is uploaded anywhere.
 * It only ever carries what the person already sees on screen (a feeling family, a few words, shares in percent).
 */
export type CardSpec = {
  brand: string;
  month: string;          // e.g. "October 2026"
  heading: string;        // e.g. "This month, as me"
  familyLabel: string;    // "The feeling you visit most"
  family: string;         // "Weariness"
  wordsLabel: string;     // "Your go-to words"
  words: string[];
  lean: { pleasant: number; unpleasant: number; between: number };
  leanLabels: [pleasant: string, unpleasant: string, between: string];
  extra: string[];        // short lines, e.g. the change since last month and new words
  footer: string;
};

export const CARD_W = 1080, CARD_H = 1350;

/** Greedy line breaking that also works for text without spaces (Japanese, Chinese, Korean). */
export function wrapText(measure: (s: string) => number, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const token of text.split(/(?<=\s)/)) {
    if (measure((line + token).trimEnd()) <= max) { line += token; continue; }
    if (line.trim()) { lines.push(line.trimEnd()); line = ""; }
    if (measure(token.trimEnd()) <= max) { line = token; continue; }
    for (const ch of token) {                  // one long token: break between characters
      if (measure(line + ch) > max && line) { lines.push(line); line = ""; }
      line += ch;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

const TITLE_FONT = '"Dunggeun", "Apple SD Gothic Neo", "Noto Sans KR", "Hiragino Sans", "Noto Sans JP", "PingFang TC", system-ui, sans-serif';
const BODY_FONT = '"Apple SD Gothic Neo", "Noto Sans KR", "Hiragino Sans", "Noto Sans JP", "PingFang TC", "Segoe UI", system-ui, sans-serif';

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function drawMonthCard(canvas: HTMLCanvasElement, s: CardSpec): void {
  canvas.width = CARD_W; canvas.height = CARD_H;
  const c = canvas.getContext("2d");
  if (!c) return;
  const g = c.createLinearGradient(0, 0, CARD_W * 0.5, CARD_H);
  g.addColorStop(0, "#ffe2cf"); g.addColorStop(0.5, "#ffd0e0"); g.addColorStop(1, "#e2d6ff");
  c.fillStyle = g; c.fillRect(0, 0, CARD_W, CARD_H);

  const px = 72, pw = CARD_W - px * 2, py = 150, ph = CARD_H - py - 150;
  c.fillStyle = "#ffffff"; roundRect(c, px, py, pw, ph, 56); c.fill();

  c.textBaseline = "alphabetic"; c.textAlign = "left";
  c.fillStyle = "#1c1b1f"; c.font = `700 52px ${TITLE_FONT}`; c.fillText(s.brand, px, 100);
  c.textAlign = "right"; c.fillStyle = "#5e5a57"; c.font = `600 34px ${BODY_FONT}`; c.fillText(s.month, CARD_W - px, 98);
  c.textAlign = "left";

  const x = px + 56, w = pw - 112;
  let y = py + 120;
  c.fillStyle = "#8d8883"; c.font = `600 34px ${BODY_FONT}`; c.fillText(s.heading, x, y);

  y += 96;
  c.fillStyle = "#5e5a57"; c.font = `500 32px ${BODY_FONT}`; c.fillText(s.familyLabel, x, y);
  y += 108;
  c.fillStyle = "#1c1b1f"; c.font = `700 104px ${TITLE_FONT}`;
  for (const l of wrapText((t) => c.measureText(t).width, s.family, w).slice(0, 2)) { c.fillText(l, x, y); y += 116; }
  y -= 24;

  y += 60;
  c.fillStyle = "#5e5a57"; c.font = `500 32px ${BODY_FONT}`; c.fillText(s.wordsLabel, x, y);
  y += 28;
  let cx = x;
  c.font = `700 40px ${BODY_FONT}`;
  const tones = ["#ffe9a3", "#d9d0fa", "#cdefc4"];
  s.words.slice(0, 3).forEach((word, i) => {
    const tw = c.measureText(word).width + 56;
    if (cx + tw > x + w) { cx = x; y += 96; }
    c.fillStyle = tones[i % tones.length]; roundRect(c, cx, y, tw, 76, 38); c.fill();
    c.fillStyle = "#1c1b1f"; c.fillText(word, cx + 28, y + 52);
    cx += tw + 18;
  });
  y += 76 + 72;

  const total = s.lean.pleasant + s.lean.unpleasant + s.lean.between || 1;
  const seg: [number, string, string][] = [[s.lean.pleasant, "#9be3b4", s.leanLabels[0]], [s.lean.unpleasant, "#ffb199", s.leanLabels[1]], [s.lean.between, "#e6dfd8", s.leanLabels[2]]];
  c.save(); roundRect(c, x, y, w, 36, 18); c.clip();
  let bx = x;
  for (const [n, col] of seg) { const bw = (n / total) * w; c.fillStyle = col; c.fillRect(bx, y, bw, 36); bx += bw; }
  c.restore();
  y += 36 + 52;
  c.font = `600 30px ${BODY_FONT}`;
  seg.forEach(([n, col, label], i) => {
    const lx = x + i * (w / 3);
    c.fillStyle = col; c.beginPath(); c.arc(lx + 12, y - 11, 11, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#1c1b1f"; c.fillText(`${label} ${n}%`, lx + 34, y);
  });
  y += 36;

  c.fillStyle = "#5e5a57"; c.font = `500 31px ${BODY_FONT}`;
  for (const line of s.extra.slice(0, 2)) {
    for (const l of wrapText((t) => c.measureText(t).width, line, w).slice(0, 2)) { y += 48; c.fillText(l, x, y); }
  }

  c.textAlign = "center"; c.fillStyle = "#5e5a57"; c.font = `600 32px ${BODY_FONT}`;
  c.fillText(s.footer, CARD_W / 2, CARD_H - 70);
}

/** Share the card with the phone's share sheet when it can take files, otherwise download it. */
export async function shareCard(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return;
  const file = new File([blob], `${name}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file] }); return; } catch (e) { if ((e as Error).name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${name}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
