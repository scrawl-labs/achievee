const PETALS = [0, 1, 2, 3, 4, 5].map((i) => [22 + 11 * Math.cos((i * Math.PI) / 3), 22 + 11 * Math.sin((i * Math.PI) / 3)]);

/** How much of a day's plan got done, as the logo's flower. level 0..4; count = how many were done (omit when nothing was planned). */
export function DayFlower({ level, count, size = 44, label }: { level: 0 | 1 | 2 | 3 | 4; count?: number; size?: number; label?: string }) {
  return (
    <svg className={`ac-flower ac-flower--l${level}`} width={size} height={size} viewBox="0 0 44 44" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <g className="ac-flower__body">{PETALS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="7.5" />)}<circle cx="22" cy="22" r="11" /></g>
      {count !== undefined && <text x="22" y="22" textAnchor="middle" dominantBaseline="central">{count}</text>}
    </svg>
  );
}
