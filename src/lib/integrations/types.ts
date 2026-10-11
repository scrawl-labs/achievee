/** One thing the user did in an external tool, normalised so the app can treat every source the same way. */
export type WorkKind =
  | "merged" | "opened" | "review" | "issue" | "closed" | "resolved" | "commits"  // GitHub, Jira
  | "created" | "edited"                                                          // Notion pages
  | "messages" | "mentions";                                                      // Slack, counted per day
export type WorkItem = {
  id: string;
  source: Provider;
  kind: WorkKind;
  title: string;            // empty for the counted kinds ("commits", "messages", "mentions")
  url: string;
  ref: string;              // "owner/repo#12", "owner/repo" (commits), "PROJ-34", the Slack workspace, or "" (Notion)
  date: string;             // YYYY-MM-DD in the viewer's timezone
  count?: number;           // counted kinds only
  status?: string;
};

export type Provider = "github" | "jira" | "slack" | "notion";
export const PROVIDERS: Provider[] = ["github", "jira", "slack", "notion"];
export const isProvider = (v: unknown): v is Provider => PROVIDERS.includes(v as Provider);
