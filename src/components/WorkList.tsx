"use client";
import type { WorkItem, WorkKind } from "@/lib/integrations/types";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";

const KIND: Record<WorkKind, Key> = {
  merged: "int.k.merged", opened: "int.k.opened", review: "int.k.review", issue: "int.k.issue",
  closed: "int.k.closed", resolved: "int.k.resolved", commits: "int.k.commits",
};

/** GitHub's mark (Octicons "mark-github", MIT licence, github.com/primer/octicons). */
export function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg className="src-mark" width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-label="GitHub" role="img">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Jira's mark (Simple Icons, CC0, simpleicons.org). Drawn in the same single colour as the GitHub mark so the two match. */
export function JiraMark({ size = 14 }: { size?: number }) {
  return (
    <svg className="src-mark" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="Jira" role="img">
      <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.001 1.001 0 0 0 23.013 0Z" />
    </svg>
  );
}

/** What was done in connected tools on one day (or one range). Commits are only counted, per repository. */
export default function WorkList({ items }: { items: WorkItem[] }) {
  const { t } = useI18n();
  const sorted = [...items.filter((w) => w.kind !== "commits"), ...items.filter((w) => w.kind === "commits")];
  return (
    <ul>
      {sorted.map((w) => (
        <li key={w.id}>
          {w.source === "github" ? <GithubMark /> : <JiraMark />}
          <span className={`kind k-${w.kind}`}>{t(KIND[w.kind], { n: w.count ?? 0 })}</span>
          <a href={w.url} target="_blank" rel="noreferrer"><b>{w.ref}</b>{w.title && ` ${w.title}`}</a>
        </li>
      ))}
    </ul>
  );
}
