import "server-only";

/**
 * NH Investment & Securities Open API (NHPLUG), current price only. Local use: the key and secret come from .env.local.
 * Protocol read from the official SDK (github.com/PLUG-OpenAPI/nhplug-sdk, MIT): a token from /oauth2/token, then
 * POST with x-client-id / x-client-secret / Bearer headers and the parameters wrapped in {"Input_0": {...}}.
 * No order endpoint is called anywhere in this app.
 */
const BASE = "https://api.nhplug.com:8443"; // production host; the same host issues the token
const GAP_MS = 260;                          // the API allows about 4 requests per second

let token: { value: string; exp: number } | null = null;
let last = 0;
const prices = new Map<string, { price: number; at: number }>();

const creds = () => {
  const key = process.env.NHPLUG_APP_KEY, secret = process.env.NHPLUG_APP_SECRET;
  if (!key || !secret) throw new Error("NHPLUG_APP_KEY / NHPLUG_APP_SECRET are not set in .env.local");
  return { key, secret };
};

async function accessToken(force = false): Promise<string> {
  if (!force && token && token.exp > Date.now() + 60_000) return token.value;
  const { key, secret } = creds();
  const q = new URLSearchParams({ appkey: key, appsecretkey: secret, grant_type: "client_credentials", scope: "oob" });
  const r = await fetch(`${BASE}/oauth2/token?${q}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`nh token ${r.status}`);
  const j = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) throw new Error("nh token: no access_token in the response");
  token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 86400) * 1000 };
  return token.value;
}

async function call<T>(path: string, input: Record<string, string>, retry = true): Promise<T> {
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const { key, secret } = creds();
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "x-client-id": key, "x-client-secret": secret, authorization: `Bearer ${await accessToken()}`, "content-type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ Input_0: input }), cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (r.status === 401 && retry) { token = null; return call<T>(path, input, false); } // expired token: reissue once
  if (r.status === 429) throw new Error("nh rate limit (429)");
  if (!r.ok) throw new Error(`nh ${r.status}`);
  return (await r.json()) as T;
}

type Quote = { Output_0?: Record<string, string> | Record<string, string>[]; rsp_cd?: string; rsp_msg?: string };

/** Current price of a domestic stock (KRX), cached for a minute. */
export async function currentPrice(code: string): Promise<number> {
  const hit = prices.get(code);
  if (hit && Date.now() - hit.at < 60_000) return hit.price;
  const j = await call<Quote>("/krstock/quote/v1/currentPrice", { iem_cd: code, market_cd: "KRX" });
  const out = Array.isArray(j.Output_0) ? j.Output_0[0] : j.Output_0;
  const price = Number(String(out?.stck_prpr ?? "").replace(/,/g, ""));
  if (!Number.isFinite(price) || price <= 0) throw new Error(`nh: no price (${j.rsp_msg ?? "unknown response"})`);
  prices.set(code, { price, at: Date.now() });
  return price;
}
