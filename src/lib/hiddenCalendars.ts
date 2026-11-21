import { settings } from "./db";

/**
 * The Google calendars the person hid in Achievee. Same overlay rule as the own events: if the setting can't be read,
 * every calendar is shown (the choice comes back on the next load). Fixed message only, never the error or any id.
 */
export async function hiddenCalendarsOf(user: string, where: string): Promise<string[]> {
  try { return await settings.hiddenCalendars(user); } catch {
    console.warn(`${where}: calendar choice unavailable, showing every calendar`);
    return [];
  }
}
