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
