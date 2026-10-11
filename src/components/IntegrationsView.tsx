"use client";
import { useState } from "react";
import type { Provider, WorkItem } from "@/lib/integrations/types";
import { addDays } from "@/lib/dates";
import { browserTz, todayStr } from "@/lib/clientTime";
import { useI18n } from "./I18n";
import { forget, useApi } from "./useApi";

type Connected = { provider: Provider; label: string }[];
const GITHUB_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";
const JIRA_TOKEN_URL = "https://id.atlassian.com/manage-profile/security/api-tokens";

/** Connect work tools. Tokens are checked against the service, stored encrypted, and never shown again. */
export default function IntegrationsView() {
  const { t } = useI18n();
  const { data, reload } = useApi<Connected>("/api/integrations");
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<Provider | null>(null);
  const [f, setF] = useState({ ghToken: "", site: "", email: "", jiraToken: "" });
  const today = todayStr();
  const work = useApi<{ items: WorkItem[]; errors: string[]; connected: string[] }>(
    data && data.length > 0 ? `/api/work?from=${addDays(today, -29)}&to=${addDays(today, 1)}&tz=${encodeURIComponent(browserTz())}` : null).data;
  const by = (p: Provider) => (data ?? []).find((c) => c.provider === p);

  const connect = async (provider: Provider, body: Record<string, string>) => {
    setBusy(provider); setError(null);
    const r = await fetch("/api/integrations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, ...body }) });
    setBusy(null);
    if (!r.ok) return setError(provider);
    setF({ ghToken: "", site: "", email: "", jiraToken: "" }); // never keep a token in the page after it is saved
    forget("/api/work"); // what the calendar / weekly review show depends on what is connected
    reload();
  };
  const disconnect = async (provider: Provider) => { await fetch(`/api/integrations?provider=${provider}`, { method: "DELETE" }); forget("/api/work"); reload(); };

  const card = (provider: Provider, title: string, how: string, link: string, form: React.ReactNode, submit: () => void, ready: boolean) => {
    const c = by(provider);
    return (
      <section className="panel intcard" key={provider}>
        <div className="row between">
          <h3>{title}</h3>
          {c && <span className="tag ok">{t("int.connected")}</span>}
        </div>
        {c ? (
          <>
            <p className="muted">{t("int.as", { name: c.label })}</p>
            {work && (work.errors.includes(provider)
              ? <p className="error">{t("int.fetchFail", { name: title })}</p>
              : <>
                  <p className="muted">{t("int.recent", { n: work.items.filter((w) => w.source === provider).reduce((s, w) => s + (w.count ?? 1), 0) })}</p>
                  {work.items.every((w) => w.source !== provider) && <p className="muted">{t(provider === "jira" ? "int.noneHintJira" : "int.noneHint")}</p>}
                </>)}
            <div><button className="btn" onClick={() => disconnect(provider)}>{t("int.disconnect")}</button></div>
          </>
        ) : (
          <form className="intform" autoComplete="off" onSubmit={(e) => { e.preventDefault(); if (ready) submit(); }}>
            <p className="muted">{how} <a href={link} target="_blank" rel="noreferrer">{t("int.createToken")}</a></p>
            {form}
            {error === provider && <p className="error">{t("int.invalid")}</p>}
            <button className="btn primary" disabled={!ready || busy === provider}>{busy === provider ? "…" : t("int.connect")}</button>
          </form>
        )}
      </section>
    );
  };

  return (
    <div className="integrations">
      <p className="muted">{t("int.intro")}</p>
      <div className="two">
        {card("github", "GitHub", t("int.howGithub"), GITHUB_TOKEN_URL,
          <input type="password" placeholder={t("int.token")} value={f.ghToken} onChange={(e) => setF({ ...f, ghToken: e.target.value })} aria-label={t("int.token")} />,
          () => connect("github", { token: f.ghToken }), f.ghToken.trim().length > 0)}
        {card("jira", "Jira", t("int.howJira"), JIRA_TOKEN_URL,
          <>
            <input placeholder={t("int.site")} value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })} aria-label={t("int.site")} />
            <input type="email" placeholder={t("int.email")} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-label={t("int.email")} />
            <input type="password" placeholder={t("int.token")} value={f.jiraToken} onChange={(e) => setF({ ...f, jiraToken: e.target.value })} aria-label={t("int.token")} />
          </>,
          () => connect("jira", { site: f.site, email: f.email, token: f.jiraToken }), f.site.trim() !== "" && f.email.trim() !== "" && f.jiraToken.trim() !== "")}
      </div>
      <p className="muted intnote">{t("int.privacy")}</p>
    </div>
  );
}
