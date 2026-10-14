import { getUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api";
import { CONNECT_COOKIE, finishConnect } from "@/lib/googleConnect";
import { clearConnectCookie, defaultConnectDeps, integrationsRedirect } from "@/lib/googleConnectWiring";
import { warnGoogleNotConfigured } from "@/lib/googleMigration";
import { dbGoogleStore, invalidateGoogleToken } from "@/lib/googleToken";

export const dynamic = "force-dynamic";

const readCookie = (header: string | null, name: string): string | undefined =>
  header?.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

/** Google redirects back here. Every outcome ends on a fixed in-app path; the state cookie is always removed. */
export async function GET(req: Request) {
  const u = await getUser();
  if (!u) return unauthorized();
  const q = new URL(req.url).searchParams;
  const deps = defaultConnectDeps();
  if (!deps) warnGoogleNotConfigured();
  const outcome = deps
    ? await finishConnect(deps, dbGoogleStore, {
      userId: u.id, code: q.get("code") ?? undefined, state: q.get("state") ?? undefined,
      error: q.get("error") ?? undefined, cookie: readCookie(req.headers.get("cookie"), CONNECT_COOKIE),
    })
    : "error";
  if (outcome === "connected") invalidateGoogleToken(u.id); // a replaced grant must not be served from the old cached token
  const res = integrationsRedirect(req.url, outcome);
  clearConnectCookie(res);
  return res;
}
