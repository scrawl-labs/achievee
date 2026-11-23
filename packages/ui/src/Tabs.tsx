"use client";
import { useRef } from "react";
import { cx } from "./cx";

/**
 * Switches views inside one screen (2 to 5 short labels). Not for app navigation.
 * Arrow keys (and Home / End) move between tabs; only the chosen tab is in the Tab order.
 * With `idPrefix`, each tab gets id `<prefix>-tab-<value>` and points at a panel with id `<prefix>-panel-<value>`.
 */
export function Tabs<T extends string>({ items, value, onChange, label, idPrefix, variant = "line", className }: {
  items: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  idPrefix?: string;
  /** line (default): text with an underline, inside the app. pill: rounded buttons, for a few big choices (landing page).
   * segment: one sunk bar with the chosen part raised, for switching how the same data is drawn (day / week / month). */
  variant?: "line" | "pill" | "segment";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const n = (i + items.length) % items.length;
    onChange(items[n].value);
    refs.current[n]?.focus();
  };
  return (
    <div className={cx("ac-tabs", variant !== "line" && `ac-tabs--${variant}`, className)} role="tablist" aria-label={label}>
      {items.map((it, i) => (
        <button key={it.value} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" aria-selected={it.value === value} tabIndex={it.value === value ? 0 : -1}
          id={idPrefix ? `${idPrefix}-tab-${it.value}` : undefined} aria-controls={idPrefix ? `${idPrefix}-panel-${it.value}` : undefined}
          className={cx("ac-tab", it.value === value && "ac-tab--on")} onClick={() => onChange(it.value)}
          onKeyDown={(e) => {
            const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : null;
            if (to !== null) { e.preventDefault(); move(to); }
          }}>{it.label}</button>
      ))}
    </div>
  );
}
