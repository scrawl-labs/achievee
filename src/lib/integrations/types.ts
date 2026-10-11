/** One thing the user did (or must do) in an external tool, normalised so the app can treat every source the same way. */
export type WorkItem = {
  id: string;
  source: "github" | "jira";
  kind: "done";             // merged PR / resolved issue; more kinds (e.g. "review requested") can follow
  title: string;
  url: string;
  ref: string;              // "owner/repo#12" or "PROJ-34"
  date: string;             // YYYY-MM-DD in the viewer's timezone
  status?: string;
};

export type Provider = "github" | "jira";
export const PROVIDERS: Provider[] = ["github", "jira"];
export const isProvider = (v: unknown): v is Provider => PROVIDERS.includes(v as Provider);
