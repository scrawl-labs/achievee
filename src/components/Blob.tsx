/** Clover-shaped day badge. level 0..4 picks the pastel colour; `face` swaps the number for a mascot face. */
export default function Blob({ level, label, face = false }: { level: number; label?: string | number; face?: boolean }) {
  return (
    <svg className={`blob l${level}`} viewBox="0 0 44 44" aria-hidden="true">
      <g className="body">
        <circle cx="14" cy="14" r="11" /><circle cx="30" cy="14" r="11" />
        <circle cx="14" cy="30" r="11" /><circle cx="30" cy="30" r="11" />
        <rect x="14" y="14" width="16" height="16" />
      </g>
      {level === 4 && <path className="spark" d="M38 2l1.6 4.4L44 8l-4.4 1.6L38 14l-1.6-4.4L32 8l4.4-1.6z" />}
      {face ? <Face level={level} /> : label !== undefined && label !== "" && (
        <text x="22" y="22" textAnchor="middle" dominantBaseline="central" className="lbl">{label}</text>
      )}
    </svg>
  );
}

function Face({ level }: { level: number }) {
  const mouth = level >= 3 ? "M16 25q6 7 12 0" : level === 0 ? "M17 28q5-4 10 0" : "M18 27h8";
  return (
    <g className="face">
      {level === 4 ? <><path d="M14.5 21q2-3 4 0M25.5 21q2-3 4 0" className="stroke" /><circle cx="12" cy="26" r="2.6" className="cheek" /><circle cx="32" cy="26" r="2.6" className="cheek" /></>
        : <><circle cx="16.5" cy="20" r="1.9" /><circle cx="27.5" cy="20" r="1.9" /></>}
      <path d={mouth} className="stroke" />
    </g>
  );
}
