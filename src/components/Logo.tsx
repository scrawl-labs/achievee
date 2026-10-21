import Wordmark from "./Wordmark";

/** The flower mark on its own (pink petals, white check). */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="152 200 950 890" role="img" aria-label="Achievee" style={{ display: "block", flex: "none" }}>
      <g fill="#FB78A2">
        <circle cx="625" cy="388" r="187" /><circle cx="333" cy="585" r="187" /><circle cx="922" cy="585" r="187" />
        <circle cx="435" cy="905" r="187" /><circle cx="815" cy="905" r="187" /><circle cx="627" cy="665" r="235" />
      </g>
      <path d="M490 668L585 770L790 577" fill="none" stroke="#F8F7F2" strokeWidth="100" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark + wordmark lockup: the flower sits left of the text. */
export default function Logo({ height = 22 }: { height?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: height * 0.4 }}>
      <Mark size={Math.round(height * 1.3)} />
      <Wordmark height={height} />
    </span>
  );
}
