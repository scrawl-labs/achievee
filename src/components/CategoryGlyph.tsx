import type { Category } from "@/lib/i18n";

/**
 * Spending category glyphs, drawn for Achievee: solid shapes in one grey on a soft grey tile (no icon set).
 * `m` is the shape, `a` its lighter accent, `w` the cut-outs (the tile's own colour), so they follow the theme.
 */
const m = "currentColor", a = "color-mix(in oklab, currentColor 60%, transparent)", w = "var(--surface-2)";
const GLYPH: Record<Category, JSX.Element> = {
  food: <><path d="M7 22h34a17 15 0 0 1-34 0z" fill={m} /><rect x="5" y="20" width="38" height="5" rx="2.5" fill={a} /><path d="M11 20a13 9 0 0 1 26 0z" fill={w} /><rect x="17" y="37" width="14" height="4" rx="2" fill={a} /></>,
  cafe: <><path d="M10 14h24l-2.5 22a4 4 0 0 1-4 3.5H16.5a4 4 0 0 1-4-3.5z" fill={m} /><path d="M33.5 18h3a5 5 0 0 1 0 10h-4" fill="none" stroke={m} strokeWidth="3.4" strokeLinecap="round" /><rect x="9" y="11" width="26" height="5" rx="2.5" fill={a} /><path d="M17 4c-2 2 2 3 0 5M24 4c-2 2 2 3 0 5" stroke={a} strokeWidth="2.2" fill="none" strokeLinecap="round" /></>,
  transport: <><rect x="9" y="6" width="30" height="32" rx="9" fill={m} /><rect x="13" y="11" width="22" height="11" rx="3.5" fill={w} /><circle cx="16.5" cy="30" r="2.6" fill={w} /><circle cx="31.5" cy="30" r="2.6" fill={w} /><path d="M15 38l-4 5M33 38l4 5" stroke={a} strokeWidth="3.2" strokeLinecap="round" /></>,
  shopping: <><path d="M17 16v-3a7 7 0 0 1 14 0v3" fill="none" stroke={a} strokeWidth="3.2" strokeLinecap="round" /><path d="M9.5 16h29l2 23a4 4 0 0 1-4 4.5h-25a4 4 0 0 1-4-4.5z" fill={m} /><circle cx="18" cy="23" r="2" fill={w} /><circle cx="30" cy="23" r="2" fill={w} /></>,
  culture: <><path d="M6 14a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v5a5 5 0 0 0 0 10v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-5a5 5 0 0 0 0-10z" fill={m} /><path d="M31 13v22" stroke={w} strokeWidth="2" strokeDasharray="2.6 2.6" /><path d="M18.5 18l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill={w} /></>,
  fixed: <><path d="M24 6L5 21.5h5.5V40a2 2 0 0 0 2 2h23a2 2 0 0 0 2-2V21.5H43z" fill={m} /><path d="M24 6L5 21.5h38z" fill={a} /><rect x="20" y="29" width="8" height="13" rx="2" fill={w} /></>,
  other: <><circle cx="24" cy="24" r="18" fill={m} /><circle cx="24" cy="24" r="12.5" fill="none" stroke={a} strokeWidth="2.4" /><path d="M19 24h10M24 19v10" stroke={w} strokeWidth="3" strokeLinecap="round" /></>,
};

export default function CategoryGlyph({ c }: { c: Category }) {
  return (
    <svg className="ex-ic" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="var(--surface-2)" />
      <g transform="translate(10 10) scale(.583)">{GLYPH[c]}</g>
    </svg>
  );
}
