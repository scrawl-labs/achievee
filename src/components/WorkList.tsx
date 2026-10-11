"use client";
import type { WorkItem, WorkKind } from "@/lib/integrations/types";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";

const KIND: Record<WorkKind, Key> = {
  merged: "int.k.merged", opened: "int.k.opened", review: "int.k.review", issue: "int.k.issue",
  closed: "int.k.closed", resolved: "int.k.resolved", commits: "int.k.commits",
  created: "int.k.created", edited: "int.k.edited", messages: "int.k.messages", mentions: "int.k.mentions",
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

/** Slack's and Notion's marks (Simple Icons, CC0, simpleicons.org), single colour like the others. */
export function SlackMark({ size = 14 }: { size?: number }) {
  return (
    <svg className="src-mark" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="Slack" role="img">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}
export function NotionMark({ size = 14 }: { size?: number }) {
  return (
    <svg className="src-mark" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-label="Notion" role="img">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  );
}
export const MARKS = { github: GithubMark, jira: JiraMark, slack: SlackMark, notion: NotionMark };

/** What was done in connected tools on one day (or one range). Commits are only counted, per repository. */
export default function WorkList({ items }: { items: WorkItem[] }) {
  const { t } = useI18n();
  const sorted = [...items.filter((w) => w.kind !== "commits"), ...items.filter((w) => w.kind === "commits")];
  return (
    <ul>
      {sorted.map((w) => (
        <li key={w.id}>
          {(() => { const M = MARKS[w.source]; return <M />; })()}
          <span className={`kind k-${w.kind}`}>{t(KIND[w.kind], { n: w.count ?? 0 })}</span>
          <a href={w.url} target="_blank" rel="noreferrer">{w.ref && <b>{w.ref}</b>}{w.ref && w.title && " "}{w.title}</a>
        </li>
      ))}
    </ul>
  );
}
