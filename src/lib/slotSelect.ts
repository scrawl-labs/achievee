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
