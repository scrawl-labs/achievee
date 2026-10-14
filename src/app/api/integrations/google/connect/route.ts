import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api";
import { startConnect } from "@/lib/googleConnect";
import { warnGoogleNotConfigured } from "@/lib/googleMigration";
import { defaultConnectDeps, integrationsRedirect, setConnectCookie } from "@/lib/googleConnectWiring";

export const dynamic = "force-dynamic";

/** Starts "connect Google Calendar": state + PKCE verifier go into a sealed short-lived cookie, then on to Google. */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const deps = defaultConnectDeps();
  if (!deps) { warnGoogleNotConfigured(); return integrationsRedirect(req.url, "error"); } // misconfigured deployment: fixed answer, no details
  const { url, cookieValue } = startConnect(deps, { userId: u.id, email: u.email });
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "private, no-store");
  setConnectCookie(res, cookieValue);
  return res;
}
