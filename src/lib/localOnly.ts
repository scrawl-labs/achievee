import "server-only";

/** Features that use personal brokerage credentials run on this PC only: never on Vercel, never on a public host. */
export function isLocalRequest(host: string | null): boolean {
  if (process.env.VERCEL) return false;
  const h = (host ?? "").toLowerCase().replace(/:\d+$/, "");
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}
