"use client";
import { Checkbox } from "@achievee/ui";
import { useEffect, useState } from "react";
import type { GoogleCalendar } from "@/lib/calendarSources";
import { useI18n } from "./I18n";
import { invalidate, useApi } from "./useApi";
import Icon from "./Icon";

type Answer = { status: string; calendars: GoogleCalendar[]; hidden: string[] };

/**
 * Under the connected Google card: a checkbox per Google calendar, so a busy shared or holiday calendar can be hidden.
 * The list is only fetched once opened. Saved on the account (/api/settings), and the server leaves hidden calendars out of every view.
 */
export default function GoogleCalendarPicker() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { data, error, reload } = useApi<Answer>(open ? "/api/integrations/google/calendars" : null);
  const [hidden, setHidden] = useState<string[] | null>(null); // local copy while a save is in flight
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false); // one save at a time, so each one sends the list the previous one left
  useEffect(() => { if (data) setHidden(data.hidden); }, [data]);

  const cals = data?.calendars ?? [];
  const off = new Set(hidden ?? []);
  const toggle = async (id: string, show: boolean) => {
    const prev = hidden ?? [];
    const next = show ? prev.filter((h) => h !== id) : [...prev, id];
    setHidden(next); setFailed(false); setBusy(true);
    let ok = false;
    try {
      const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hiddenCalendars: next }) });
      ok = r.ok;
    } catch { /* shown below */ }
    setBusy(false);
    if (!ok) { setHidden(prev); setFailed(true); return; }
    invalidate("/api/events"); invalidate("/api/month"); // every view drops (or brings back) that calendar
    void reload();
  };

  return (
    <div className="intstate gcals">
      <button type="button" className="gcals-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="grow">{t("gc.cals")}</span>
        {data && cals.length > 0 && <small className="muted">{t("gc.calsCount", { n: cals.filter((c) => !off.has(c.id)).length, total: cals.length })}</small>}
        <Icon name="right" size={14} />
      </button>
      {open && <>
        {error && <p className="error">{t("gc.calsLoadFail")}</p>}
        {data && cals.length === 0 && <p className="muted">{t("gc.calsNone")}</p>}
        {cals.length > 0 && (
          <ul className="gcals-list">
            {cals.map((c) => (
              <li key={c.id}>
                <label style={{ ["--ev" as string]: c.color }}>
                  <Checkbox shape="square" checked={!off.has(c.id)} disabled={busy} onChange={(e) => void toggle(c.id, e.target.checked)} />
                  <i aria-hidden="true" /><span>{c.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {failed && <p className="error">{t("gc.calsSaveFail")}</p>}
        <p className="muted">{t("gc.calsHint")}</p>
      </>}
    </div>
  );
}
