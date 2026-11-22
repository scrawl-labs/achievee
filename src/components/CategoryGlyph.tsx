import type { Category } from "@/lib/i18n";

/** Spending category glyphs, drawn in the same line style as the sidebar icons (24px grid, 1.75 stroke, round ends). */
const GLYPH: Record<Category, JSX.Element> = {
  food: <><path d="M3.5 11h17" /><path d="M4.5 11a7.5 7 0 0 0 15 0" /><path d="M9 20h6" /><path d="M13.5 3.5l-2 5M18 4.5l-3.5 4" /></>,
  cafe: <><path d="M5 9h11v5.5A4.5 4.5 0 0 1 11.5 19h-2A4.5 4.5 0 0 1 5 14.5z" /><path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" /><path d="M8.5 3.5v2.5M12.5 3.5v2.5" /></>,
  transport: <><rect x="5.5" y="3.5" width="13" height="14" rx="3.5" /><path d="M5.5 10.5h13" /><path d="M9 14h.01M15 14h.01" /><path d="M8.5 17.5l-2 3M15.5 17.5l2 3" /></>,
  shopping: <><path d="M5.5 8h13l-1 11.5A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" /></>,
  culture: <><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z" /><path d="M14.5 6.5v11" strokeDasharray="1.5 2.2" /></>,
  fixed: <><path d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" /><path d="M9 8h6M9 11.5h6M9 15h3" /></>,
  other: <><path d="M4 12.5V5.5A1.5 1.5 0 0 1 5.5 4h7l7.5 7.5-8.5 8.5z" /><circle cx="8.5" cy="8.5" r="1.2" /></>,
};

export default function CategoryGlyph({ c }: { c: Category }) {
  return (
    <svg className="ex-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {GLYPH[c]}
    </svg>
  );
}
