"use client";
import { useState } from "react";
import { METRICS, type BodyRow, type Metric, latestChange, show } from "@/lib/body";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import Icon from "./Icon";
import DatePicker from "./DatePicker";

const send = (url: string, method: string, body?: unknown) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const UNIT: Record<Metric, string> = { fat: "%", muscle: "kg", weight: "kg" };
const label = (m: Metric) => `body.${m}` as Key;
type Form = { date: string; weight: string; fat: string; muscle: string };
const blank = (date: string): Form => ({ date, weight: "", fat: "", muscle: "" });
const filled = (f: Form) => METRICS.some((m) => f[m].trim() !== "");

/** Line chart of one metric over time, spaced by date. */
function Trend({ rows, metric }: { rows: BodyRow[]; metric: Metric }) {
  const pts = rows.filter((r) => r[metric] !== undefined).map((r) => ({ t: Date.parse(r.date), v: r[metric]! })).sort((a, b) => a.t - b.t).slice(-30);
  if (pts.length < 2) return null;
  const W = 600, H = 170, PX = 44, PY = 22;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t;
  const min = Math.min(...pts.map((p) => p.v)), max = Math.max(...pts.map((p) => p.v)), span = Math.max(max - min, 10);
  // a flat stretch (a change of a tenth or two) is centred in a one-unit window, so the two axis labels never sit on top of each other
  const lo = Math.round((min + max) / 2 - span / 2), hi = lo + span;
  const x = (t: number) => PX + ((t - t0) / Math.max(t1 - t0, 1)) * (W - PX - 16);
  const y = (v: number) => PY + (1 - (v - lo) / span) * (H - PY * 2);
  const last = pts[pts.length - 1];
  return (
    <svg className="body-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${show(last.v)}${UNIT[metric]}`}>
      {[lo, hi].map((v) => <g key={v}><line x1={PX} x2={W - 16} y1={y(v)} y2={y(v)} className="grid" /><text x={PX - 8} y={y(v) + 4} textAnchor="end">{show(v)}</text></g>)}
      <polyline fill="none" className="line" points={pts.map((p) => `${x(p.t)},${y(p.v)}`).join(" ")} />
      {pts.map((p) => <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={3.5} className="dot" />)}
      <text x={x(last.t)} y={y(last.v) - 10} textAnchor="end" className="now">{show(last.v)}{UNIT[metric]}</text>
    </svg>
  );
}

/** Body composition log (InBody and similar): the point is the body-fat trend, not the scale. */
export default function BodyLog({ sel, setSel }: { sel: string; setSel: (d: string) => void }) {
  const { t, fmt } = useI18n();
  const { data, reload } = useApi<BodyRow[]>("/api/body");
  const rows = data ?? [];
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<Metric>("fat");
  const [f, setF] = useState<Form>(blank(sel));
  const [editId, setEditId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Form>(blank(sel));

  const payload = (v: Form) => ({ date: v.date, weight: v.weight, fat: v.fat, muscle: v.muscle });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filled(f)) return;
    const r = await send("/api/body", "POST", payload({ ...f, date: sel }));
    if (r.ok) { setF(blank(sel)); setOpen(false); reload(); }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId === null || !filled(draft)) return;
    const r = await send("/api/body", "PATCH", { id: editId, ...payload(draft) });
    if (r.ok) { setEditId(null); reload(); }
  };
  const del = async (id: number) => { await send(`/api/body?id=${id}`, "DELETE"); reload(); };
  const fields = (v: Form, set: (v: Form) => void) => METRICS.map((m) => (
    <input key={m} placeholder={`${t(label(m))} (${UNIT[m]})`} inputMode="decimal" value={v[m]} onChange={(e) => set({ ...v, [m]: e.target.value })} aria-label={t(label(m))} />
  ));
  const tiles = METRICS.map((m) => ({ m, c: latestChange(rows, m) })).filter((x) => x.c);

  return (
    <section className="bodylog">
      <div className="sechead">
        <h3>{t("body.title")}</h3>
        <button type="button" className={`btn icon add${open ? " open" : ""}`} aria-expanded={open} aria-label={open ? t("common.close") : t("body.addAria")} onClick={() => setOpen(!open)}><Icon name="plus" /></button>
      </div>
      {open && (
        <form className="panel entry" onSubmit={add}>
          <DatePicker value={sel} onChange={setSel} />
          {fields(f, setF)}
          <button className="btn primary" disabled={!filled(f)}>{t("common.add")}</button>
        </form>
      )}

      {rows.length === 0 && !open && <p className="muted">{t("body.empty")}</p>}
      {rows.length > 0 && (
        <div className="panel body-panel">
          <div className="body-tiles">
            {tiles.map(({ m, c }) => (
              <button type="button" key={m} className={metric === m ? "on" : ""} aria-pressed={metric === m} onClick={() => setMetric(m)}>
                <small>{t(label(m))}</small>
                <b>{show(c!.value)}<em>{UNIT[m]}</em></b>
                {c!.delta !== null && <span className={c!.delta === 0 || m === "weight" ? "" : (m === "muscle") === (c!.delta > 0) ? "good" : "bad"}>{c!.delta > 0 ? "+" : c!.delta < 0 ? "−" : ""}{show(Math.abs(c!.delta))}</span>}
              </button>
            ))}
          </div>
          <Trend rows={rows} metric={metric} />
        </div>
      )}

      <div className="list">
        {rows.slice(0, 12).map((r) => editId === r.id ? (
          <form className="panel entry" key={r.id} onSubmit={save}>
            <DatePicker value={draft.date} onChange={(d) => setDraft({ ...draft, date: d })} />
            {fields(draft, setDraft)}
            <div className="edit-actions">
              <button type="button" className="btn" onClick={() => setEditId(null)}>{t("common.cancel")}</button>
              <button className="btn primary" disabled={!filled(draft)}>{t("common.save")}</button>
            </div>
          </form>
        ) : (
          <div className="item static erow noChip" key={r.id}>
            <div className="emain">
              <span className="etop"><b>{fmt.date(r.date)}</b></span>
              <span className="ememo">{METRICS.filter((m) => r[m] !== undefined).map((m) => `${t(label(m))} ${show(r[m]!)}${UNIT[m]}`).join(" · ")}</span>
            </div>
            <div className="eside solo">
              <span className="acts">
                <button className="btn icon ghost" onClick={() => { setEditId(r.id); setDraft({ date: r.date, weight: r.weight !== undefined ? show(r.weight) : "", fat: r.fat !== undefined ? show(r.fat) : "", muscle: r.muscle !== undefined ? show(r.muscle) : "" }); }} aria-label={t("common.edit")} title={t("common.edit")}><Icon name="edit" size={16} /></button>
                <button className="btn icon ghost" onClick={() => del(r.id)} aria-label={t("common.delete")}><Icon name="close" size={16} /></button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
