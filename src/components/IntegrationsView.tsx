"use client";
import { useState } from "react";
import type { Provider, WorkItem } from "@/lib/integrations/types";
import type { Key } from "@/lib/i18n";
import { addDays } from "@/lib/dates";
import { browserTz, todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import Icon from "./Icon";
import { forget, useApi } from "./useApi";
import { GithubMark, JiraMark, NotionMark, SlackMark } from "./WorkList";

type Connected = { provider: Provider; label: string }[];
const GITHUB_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";
const JIRA_TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";
const SLACK_TOKEN_URL = "https://api.slack.com/apps";
const NOTION_TOKEN_URL = "https://www.notion.so/profile/integrations";

/** Browse and connect tools. Google Calendar / Tasks are the base of the app (always on, read-only); work tools are optional and use personal tokens. */
export default function IntegrationsView() {
  const { t } = useI18n();
  const { data, reload } = useApi<Connected>("/api/integrations");
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<Provider | null>(null);
  const [open, setOpen] = useState<Provider | null>(null);
  const [f, setF] = useState({ ghToken: "", site: "", email: "", jiraToken: "", slackToken: "", notionToken: "" });
  const today = todayStr();
  const work = useApi<{ items: WorkItem[]; errors: string[]; connected: string[] }>(
    data && data.length > 0 ? `/api/work?from=${addDays(today, -29)}&to=${addDays(today, 1)}&tz=${encodeURIComponent(browserTz())}` : null).data;
  const by = (p: Provider) => (data ?? []).find((c) => c.provider === p);

  const connect = async (provider: Provider, body: Record<string, string>) => {
    setBusy(provider); setError(null);
    const r = await fetch("/api/integrations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, ...body }) });
    setBusy(null);
    if (!r.ok) return setError(provider);
    setF({ ghToken: "", site: "", email: "", jiraToken: "", slackToken: "", notionToken: "" }); // never keep a token in the page after it is saved
    setOpen(null);
    forget("/api/work"); // what the calendar / weekly review show depends on what is connected
    reload();
  };
  const disconnect = async (provider: Provider) => { await fetch(`/api/integrations?provider=${provider}`, { method: "DELETE" }); forget("/api/work"); reload(); };

  const tile = (icon: React.ReactNode) => <span className="inttile">{icon}</span>;

  const base = (icon: React.ReactNode, name: string, desc: Key) => (
    <div className="intcard" key={name}>
      {tile(icon)}
      <div className="intbody"><b>{name}</b><small className="muted">{t(desc)}</small></div>
      <span className="tag ok">{t("int.baseTag")}</span>
    </div>
  );

  const tool = (provider: Provider, icon: React.ReactNode, name: string, desc: Key, link: string, form: React.ReactNode, submit: () => void, ready: boolean) => {
    const c = by(provider);
    const n = work && !work.errors.includes(provider) ? work.items.filter((w) => w.source === provider).reduce((s, w) => s + (w.count ?? 1), 0) : null;
    return (
      <div className="intslot" key={provider}>
        <div className="intcard">
          {tile(icon)}
          <div className="intbody">
            <b>{name}</b>
            {c
              ? <><span className="intacct">{c.label}</span><small className="intok"><i />{t("int.connected")}</small></>
              : <small className="muted">{t(desc)}</small>}
          </div>
          {c
            ? <button className="btn danger" onClick={() => disconnect(provider)}>{t("int.disconnect")}</button>
            : <button className="btn" aria-expanded={open === provider} onClick={() => setOpen(open === provider ? null : provider)}>{t("int.connect")}</button>}
        </div>
        {c && work && (
          <div className="intstate">
            {work.errors.includes(provider)
              ? <p className="error">{t("int.fetchFail", { name })}</p>
              : <>
                  <p className="muted">{t("int.recent", { n: n ?? 0 })}</p>
                  {n === 0 && <p className="muted">{t(provider === "jira" ? "int.noneHintJira" : provider === "slack" ? "int.noneHintSlack" : provider === "notion" ? "int.noneHintNotion" : "int.noneHint")}</p>}
                </>}
          </div>
        )}
        {!c && open === provider && (
          <form className="intform" autoComplete="off" onSubmit={(e) => { e.preventDefault(); if (ready) submit(); }}>
            <p className="muted"><a href={link} target="_blank" rel="noreferrer">{t("int.createToken")}</a></p>
            {form}
            {error === provider && <p className="error">{t("int.invalid")}</p>}
            <button className="btn primary" disabled={!ready || busy === provider}>{busy === provider ? "…" : t("int.connect")}</button>
          </form>
        )}
      </div>
    );
  };

  const soon = (mono: string, name: string, desc: Key) => (
    <div className="intcard soon" key={name}>
      {tile(<b className="mono">{mono}</b>)}
      <div className="intbody"><b>{name}</b><small className="muted">{t(desc)}</small></div>
      <span className="tag">{t("int.soon")}</span>
    </div>
  );

  return (
    <div className="integrations">
      <p className="muted">{t("int.intro")}</p>

      <h3 className="intsec">{t("int.secBase")}</h3>
      <div className="intgrid">
        {base(<Icon name="calendar" />, "Google Calendar", "int.gcalDesc")}
        {base(<Icon name="check" />, "Google Tasks", "int.gtasksDesc")}
      </div>

      <h3 className="intsec">{t("int.secDev")}</h3>
      <div className="intgrid">
        {tool("github", <GithubMark size={22} />, "GitHub", "int.ghDesc", GITHUB_TOKEN_URL,
          <input type="password" placeholder={t("int.token")} value={f.ghToken} onChange={(e) => setF({ ...f, ghToken: e.target.value })} aria-label={t("int.token")} />,
          () => connect("github", { token: f.ghToken }), f.ghToken.trim().length > 0)}
        {tool("jira", <JiraMark size={22} />, "Jira", "int.jiraDesc", JIRA_TOKEN_URL,
          <>
            <input placeholder={t("int.site")} value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} aria-label={t("int.site")} />
            <input type="email" placeholder={t("int.email")} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label={t("int.email")} />
            <input type="password" placeholder={t("int.token")} value={f.jiraToken} onChange={(e) => setF({ ...f, jiraToken: e.target.value })} aria-label={t("int.token")} />
          </>,
          () => connect("jira", { site: f.site, email: f.email, token: f.jiraToken }), f.site.trim() !== "" && f.email.trim() !== "" && f.jiraToken.trim() !== "")}
        {tool("slack", <SlackMark size={22} />, "Slack", "int.slackDesc", SLACK_TOKEN_URL,
          <input type="password" placeholder={t("int.token")} value={f.slackToken} onChange={(e) => setF({ ...f, slackToken: e.target.value })} aria-label={t("int.token")} />,
          () => connect("slack", { token: f.slackToken }), f.slackToken.trim().length > 0)}
        {tool("notion", <NotionMark size={22} />, "Notion", "int.notionDesc", NOTION_TOKEN_URL,
          <input type="password" placeholder={t("int.token")} value={f.notionToken} onChange={(e) => setF({ ...f, notionToken: e.target.value })} aria-label={t("int.token")} />,
          () => connect("notion", { token: f.notionToken }), f.notionToken.trim().length > 0)}
      </div>

      <h3 className="intsec">{t("int.secSoon")}</h3>
      <div className="intgrid">
        {soon("C", "Claude", "int.claudeDesc")}
      </div>

    </div>
  );
}
