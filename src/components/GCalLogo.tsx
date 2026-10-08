/** Approximation of the Google Calendar app icon; the number shows today's date. */
export default function GCalLogo({ size = 20, day }: { size?: number; day?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" rx="5" fill="#fff" />
      <path d="M6 11a5 5 0 0 1 5-5h20v5H11v26H6z" fill="#4285F4" />
      <path d="M6 37h5v5a5 5 0 0 1-5-5z" fill="#188038" />
      <path d="M11 37h26v5H11z" fill="#34A853" />
      <path d="M37 32h5v5a5 5 0 0 1-5 5z" fill="#FBBC04" />
      <path d="M37 11h5v21h-5z" fill="#FBBC04" />
      <path d="M31 6h6a5 5 0 0 1 5 5H37v0z" fill="#EA4335" />
      <path d="M31 6l6 5h5a5 5 0 0 0-5-5z" fill="#EA4335" />
      <path d="M31 6v5h6z" fill="#C5221F" />
      {day !== undefined && (
        <text x="24" y="31" textAnchor="middle" fontSize="17" fontWeight="700" fill="#4285F4" fontFamily="Pretendard Variable, sans-serif">{day}</text>
      )}
    </svg>
  );
}
