// "Achievee" set in Hakgyoansim Dunggeunmiso Bold (KERIS, SIL OFL 1.1). Rendered as real text from a 1 KB subset of the font
// (public/fonts/Wordmark-Achievee.woff2, only the glyphs of this word) so the browser rasterizes it for the screen
// and small sizes stay crisp. An SVG outline looked soft on 1x displays.
export default function Wordmark({ height = 22 }: { height?: number }) {
  return (
    <span className="wordmark" role="img" aria-label="Achievee" style={{ fontSize: (height * 1000) / 862, lineHeight: `${height}px`, height }}>
      Achievee
    </span>
  );
}
