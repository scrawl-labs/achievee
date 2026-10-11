/** One thing the user did in an external tool, normalised so the app can treat every source the same way. */
export type WorkKind = "merged" | "opened" | "review" | "issue" | "closed" | "resolved" | "commits";
export type WorkItem = {
  id: string;
  source: "github" | "jira";
  kind: WorkKind;           // merged / opened PR, review given, issue opened / closed, Jira issue resolved, or a commit count
  title: string;            // empty for "commits"
  url: string;
  ref: string;              // "owner/repo#12", "owner/repo" (commits) or "PROJ-34"
  date: string;             // YYYY-MM-DD in the viewer's timezone
  count?: number;           // "commits" only
  status?: string;
};

export type Provider = "github" | "jira";
export const PROVIDERS: Provider[] = ["github", "jira"];
export const isProvider = (v: unknown): v is Provider => PROVIDERS.includes(v as Provider);
