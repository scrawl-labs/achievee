const PETALS = [0, 1, 2, 3, 4, 5].map((i) => [22 + 11 * Math.cos((i * Math.PI) / 3), 22 + 11 * Math.sin((i * Math.PI) / 3)]);

/** Flower-shaped day badge. level 0..4 picks the pastel colour. */
export default function Blob({ level, label }: { level: number; label?: string | number }) {
  return (
    <svg className={`blob l${level}`} viewBox="0 0 44 44" aria-hidden="true">
      <g className="body">
        {PETALS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7.5" />)}
        <circle cx="22" cy="22" r="11" />
      </g>
      {level === 4 && <path className="spark" d="M38 2l1.6 4.4L44 8l-4.4 1.6L38 14l-1.6-4.4L32 8l4.4-1.6z" />}
      {face ? <Face level={level} /> : label !== undefined && label !== "" && (
        <text x="22" y="22" textAnchor="middle" dominantBaseline="central" className="lbl">{label}</text>
      )}
    </svg>
  );
}

const COLORS = ["#ff9ec4", "#ffd980", "#9be3b4", "#8fb8ff", "#c3a6ff", "#ffb199"];

/** One-shot confetti burst; mount it to play it. Pieces fly out from the centre of the nearest positioned parent. */
export function Confetti() {
  return (
    <span className="confetti" aria-hidden="true">
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2 + (i % 3) * 0.2;
        const r = 38 + ((i * 29) % 26);
        const shape = i % 3;
        return (
          <i key={i} style={{
            background: COLORS[i % COLORS.length],
            width: shape === 1 ? 4 : shape === 0 ? 7 : 9, height: shape === 1 ? 10 : shape === 0 ? 7 : 5,
            borderRadius: shape === 0 ? "50%" : 2,
            ["--dx" as string]: `${Math.cos(a) * r}px`, ["--dy" as string]: `${Math.sin(a) * r}px`,
            ["--rot" as string]: `${i * 83}deg`, animationDelay: `${(i % 4) * 30}ms`,
          }} />
        );
      })}
    </span>
  );
}
