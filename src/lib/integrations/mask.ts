import { maskGoogleStatus, type GoogleConn } from "../googleToken";

export type IntegrationRow = { provider: string; config: Record<string, string> };
export type MaskedIntegration = { provider: string; label: string } | { provider: "google"; status: "connected" | "revoked" | "none" };

/**
 * What GET /api/integrations may send to the browser. Tool rows keep their old { provider, label } shape (IntegrationsView
 * depends on it); Google is reduced to a bare status, so the refresh token can never leave through this route.
 */
export function maskIntegrations(rows: IntegrationRow[], google: GoogleConn | null): MaskedIntegration[] {
  const tools = rows.filter((r) => r.provider !== "google").map((r) => ({ provider: r.provider, label: r.config.label ?? "" }));
  return [...tools, { provider: "google", status: maskGoogleStatus(google) }];
}
