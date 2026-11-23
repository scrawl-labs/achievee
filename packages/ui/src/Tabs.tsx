import { cx } from "./cx";

/** Switches views inside one screen (2 to 5 short labels). Not for app navigation. */
export function Tabs<T extends string>({ items, value, onChange, label, className }: { items: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string; className?: string }) {
  return (
    <div className={cx("ac-tabs", className)} role="tablist" aria-label={label}>
      {items.map((it) => (
        <button key={it.value} type="button" role="tab" aria-selected={it.value === value} className={cx("ac-tab", it.value === value && "ac-tab--on")} onClick={() => onChange(it.value)}>{it.label}</button>
      ))}
    </div>
  );
}
