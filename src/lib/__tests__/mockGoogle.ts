import { vi } from "vitest";

export type Route = { match: RegExp; reply: (url: URL) => unknown };

/** Replaces global fetch with a router over fake Google API responses. Returns the list of requested URLs. */
export function stubGoogle(routes: readonly Route[]): string[] {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: string | URL | Request): Promise<Response> => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(raw);
    const url = new URL(raw);
    const route = routes.find((r) => r.match.test(url.pathname));
    if (!route) return new Response(`no mock for ${url.pathname}`, { status: 404 });
    return new Response(JSON.stringify(route.reply(url)), { status: 200 });
  });
  return calls;
}

export const calendarList = (items: readonly Record<string, unknown>[]): Route => ({
  match: /\/calendarList$/, reply: () => ({ items }),
});

export const calendarEvents = (calendarId: string, items: readonly Record<string, unknown>[]): Route => ({
  match: new RegExp(`/calendars/${encodeURIComponent(calendarId)}/events$`), reply: () => ({ items }),
});

export const emptyTasks: Route[] = [
  { match: /\/users\/@me\/lists$/, reply: () => ({ items: [] }) },
];
