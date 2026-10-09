/** The viewer's timezone (browser). Only call from client code after mount. */
export const browserTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
export const todayStr = () => new Intl.DateTimeFormat("en-CA", { timeZone: browserTz() }).format(new Date());
