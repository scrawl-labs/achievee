/** Drag-to-create on the hour grid: pixels to 15-minute cells, and two cells to an event's start and end. Pure. */
export const SLOT = 15;
export const DEFAULT_MINUTES = 60;
const DAY_MIN = 1440;

/** The start of the 15-minute cell under a vertical offset (px from the top of the day column). */
export function cellOfY(y: number, hourPx: number): number {
  const minutes = Math.floor((y / hourPx) * 60 / SLOT) * SLOT;
  return Math.min(DAY_MIN - SLOT, Math.max(0, minutes));
}

/**
 * The span chosen by pressing on one cell and releasing on another (either direction): both cells are included.
 * Pressing and releasing on the same cell is a click: it gives a default one-hour event (moved up so it stays inside the day).
 */
export function selectionRange(a: number, b: number): { start: number; end: number } {
  if (a === b) {
    const end = Math.min(DAY_MIN, a + DEFAULT_MINUTES);
    return { start: end - DEFAULT_MINUTES, end };
  }
  return { start: Math.min(a, b), end: Math.max(a, b) + SLOT };
}

/** Where a task dropped at `offsetY` px from the top of a day column lands: a default one-hour event starting in that 15-minute cell. */
export const slotAtPoint = (offsetY: number, hourPx: number) => { const c = cellOfY(offsetY, hourPx); return selectionRange(c, c); };

const snap = (minutes: number) => Math.round(minutes / SLOT) * SLOT;

/** An event dragged vertically by `deltaMin`: same length, start snapped to 15 minutes, kept inside the day. */
export function moveRange(start: number, end: number, deltaMin: number): { start: number; end: number } {
  const len = end - start;
  const s = Math.min(DAY_MIN - len, Math.max(0, snap(start + deltaMin)));
  return { start: s, end: s + len };
}

/** The bottom edge dragged by `deltaMin`: the start stays, the end snaps to 15 minutes, at least one slot long, no later than midnight. */
export function resizeEnd(start: number, end: number, deltaMin: number): number {
  return Math.min(DAY_MIN, Math.max(start + SLOT, snap(end + deltaMin)));
}

/** Which of `count` equal-width columns a horizontal position falls in (clamped to the first and last). */
export function columnAt(x: number, left: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor(((x - left) / width) * count)));
}
