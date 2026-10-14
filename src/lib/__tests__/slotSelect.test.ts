import { describe, expect, it } from "vitest";
import { cellOfY, selectionRange } from "@/lib/slotSelect";

const H = 56; // px per hour, like the grid

describe("cellOfY", () => {
  it("maps a vertical offset to the start of its 15-minute cell", () => {
    expect(cellOfY(0, H)).toBe(0);
    expect(cellOfY(13.9, H)).toBe(0);      // 14.9 min
    expect(cellOfY(14, H)).toBe(15);
    expect(cellOfY(H * 10 + 1, H)).toBe(600);
    expect(cellOfY(H * 10.5, H)).toBe(630);
  });
  it("stays inside the day", () => {
    expect(cellOfY(-30, H)).toBe(0);
    expect(cellOfY(H * 24 + 500, H)).toBe(1425);
  });
});

describe("selectionRange", () => {
  it("includes both cells, whichever way the drag went", () => {
    expect(selectionRange(600, 660)).toEqual({ start: 600, end: 675 });
    expect(selectionRange(660, 600)).toEqual({ start: 600, end: 675 });
    expect(selectionRange(600, 615)).toEqual({ start: 600, end: 630 });
  });
  it("a click on one cell is a default hour", () => {
    expect(selectionRange(600, 600)).toEqual({ start: 600, end: 660 });
  });
  it("a click near midnight keeps a full hour inside the day", () => {
    expect(selectionRange(1425, 1425)).toEqual({ start: 1380, end: 1440 });
    expect(selectionRange(1380, 1380)).toEqual({ start: 1380, end: 1440 });
  });
  it("a long drag to the last cell ends at midnight", () => {
    expect(selectionRange(1200, 1425)).toEqual({ start: 1200, end: 1440 });
  });
});

import { columnAt, moveRange, resizeEnd } from "@/lib/slotSelect";

describe("moveRange", () => {
  it("moves by the drag distance, snapped to 15 minutes, keeping the length", () => {
    expect(moveRange(600, 660, 0)).toEqual({ start: 600, end: 660 });
    expect(moveRange(600, 660, 60)).toEqual({ start: 660, end: 720 });
    expect(moveRange(600, 660, -37)).toEqual({ start: 570, end: 630 }); // 563 rounds to the nearest slot, 570
    expect(moveRange(600, 660, 6)).toEqual({ start: 600, end: 660 });   // less than half a slot: stays
    expect(moveRange(600, 660, 8)).toEqual({ start: 615, end: 675 });
  });
  it("cannot leave the day", () => {
    expect(moveRange(60, 120, -500)).toEqual({ start: 0, end: 60 });
    expect(moveRange(1300, 1380, 500)).toEqual({ start: 1360, end: 1440 });
  });
});

describe("resizeEnd", () => {
  it("changes only the end, snapped", () => {
    expect(resizeEnd(600, 660, 30)).toBe(690);
    expect(resizeEnd(600, 660, -20)).toBe(645);
  });
  it("keeps at least one slot and stops at midnight", () => {
    expect(resizeEnd(600, 660, -500)).toBe(615);
    expect(resizeEnd(1300, 1380, 500)).toBe(1440);
  });
});

describe("columnAt", () => {
  it("finds the column under a pointer and clamps outside the grid", () => {
    expect(columnAt(150, 100, 700, 7)).toBe(0);
    expect(columnAt(250, 100, 700, 7)).toBe(1);
    expect(columnAt(799, 100, 700, 7)).toBe(6);
    expect(columnAt(5000, 100, 700, 7)).toBe(6);
    expect(columnAt(-50, 100, 700, 7)).toBe(0);
  });
  it("a single column is always 0", () => {
    expect(columnAt(500, 100, 700, 1)).toBe(0);
  });
});
