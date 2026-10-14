// Sign-in only proves who the user is. Calendar/Tasks access is a separate, explicit "connect" step.
// Narrowest read-only scopes that authorize the calls we make (see lib/google.ts):
//   calendarList.list -> calendar.calendarlist.readonly, events.list -> calendar.events.readonly, tasks lists/tasks -> tasks.readonly

export const LOGIN_SCOPES = ["openid", "email", "profile"] as const;

export const GOOGLE_DATA_SCOPES = [
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/tasks.readonly",
] as const;

export const loginScopeParam = (): string => LOGIN_SCOPES.join(" ");
/** openid is included so the token response carries an id_token whose sub proves which Google account was connected. */
export const connectScopeParam = (): string => ["openid", ...GOOGLE_DATA_SCOPES].join(" ");

/** True when every calendar/tasks scope we need is in Google's space-separated `scope` answer. */
export function hasAllDataScopes(granted: unknown): boolean {
  if (typeof granted !== "string") return false;
  const set = new Set(granted.split(/\s+/));
  return GOOGLE_DATA_SCOPES.every((s) => set.has(s));
}
