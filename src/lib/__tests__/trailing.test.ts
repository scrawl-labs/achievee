import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTrailing } from "@/lib/trailing";

describe("createTrailing", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("five rapid calls run the function once, after the quiet period", () => {
    const fn = vi.fn();
    const t = createTrailing(fn, 600);
    for (let i = 0; i < 5; i++) { t.call(); vi.advanceTimersByTime(100); }
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(600);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("always runs once after the last call (trailing), never earlier than ms later", () => {
    const fn = vi.fn();
    const t = createTrailing(fn, 600);
    t.call();
    vi.advanceTimersByTime(599);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("calls separated by more than ms run separately", () => {
    const fn = vi.fn();
    const t = createTrailing(fn, 600);
    t.call(); vi.advanceTimersByTime(700); t.call(); vi.advanceTimersByTime(700);
    expect(fn).toHaveBeenCalledTimes(2);
  });
  it("flush runs a pending call immediately and only once", () => {
    const fn = vi.fn();
    const t = createTrailing(fn, 600);
    t.call(); t.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it("flush with nothing pending does nothing", () => {
    const fn = vi.fn();
    createTrailing(fn, 600).flush();
    expect(fn).not.toHaveBeenCalled();
  });
  it("cancel drops a pending call", () => {
    const fn = vi.fn();
    const t = createTrailing(fn, 600);
    t.call(); t.cancel(); vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });
});
