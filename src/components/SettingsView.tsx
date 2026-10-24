"use client";
import { useState } from "react";
import Link from "next/link";
import { GOAL_RANGE, type IntakeKind } from "@/lib/intake";
import type { Tab } from "@/lib/commandBar";
import { useI18n } from "./I18n";
import { useApi } from "./useApi";
import LanguageSelect from "./LanguageSelect";
import ThemeSelect from "./ThemeSelect";
import ReminderToggle from "./ReminderToggle";

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

/** A number the person can type and commit with Enter or by leaving the field; ignored when it is outside the allowed range. */
function GoalInput({ value, range, unit, onSave, label }: { value: number; range: [number, number]; unit: string; onSave: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState(String(value));
  const commit = () => {
    const n = Number(draft);
    if (Number.isInteger(n) && n >= range[0] && n <= range[1] && n !== value) onSave(n);
    else setDraft(String(value));
  };
  return (
    <input className="set-num" type="number" inputMode="numeric" aria-label={`${label} (${unit})`} value={draft} min={range[0]} max={range[1]}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
  );
}

/** Settings / my page: account, reminder, look, goals and basics, connections, about. Every control saves as soon as it changes. */
export default function SettingsView({ user, startDay, onStartDay, workoutGoal, onWorkoutGoal, intakeGoals, onIntakeGoal, onOpen, onSignOut, onDelete }: {
  user?: { name?: string | null; email?: string | null; image?: string | null };
  startDay: number; onStartDay: (d: number) => void;
  workoutGoal: number; onWorkoutGoal: (n: number) => void;
  intakeGoals: Record<IntakeKind, number>; onIntakeGoal: (k: IntakeKind, v: number) => void;
  onOpen: (tab: Tab) => void; onSignOut: () => void; onDelete: () => void;
}) {
  const { t } = useI18n();
  const { data: words } = useApi<{ id: string }[]>("/api/emotions");
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const initial = (user?.name || user?.email || "?").trim().slice(0, 1).toUpperCase();

  return (
    <div className="settings">
      <section className="panel set-me">
        <div className="set-avatar" aria-hidden="true">{user?.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : initial}</div>
        <div className="set-who">
          <b>{user?.name || user?.email || ""}</b>
          {user?.name && user?.email && <small className="muted">{user.email}</small>}
          {words && words.length > 0 && <small className="muted">{t("set.vocab", { n: words.length })}</small>}
        </div>
        <button type="button" className="btn" onClick={onSignOut}>{t("account.signOut")}</button>
      </section>

      <section className="panel">
        <h3>{t("set.notify")}</h3>
        <div className="set-row set-stack">
          <div><b>{t("set.reminder")}</b><small className="muted">{t("set.reminderDesc")}</small></div>
          <ReminderToggle variant="btn" />
        </div>
      </section>

      <section className="panel">
        <h3>{t("set.look")}</h3>
        <div className="set-row"><b>{t("account.language")}</b><LanguageSelect /></div>
        <div className="set-row"><b>{t("theme.label")}</b><ThemeSelect /></div>
      </section>

      <section className="panel">
        <h3>{t("set.goals")}</h3>
        <div className="set-row">
          <div><b>{t("set.startDay")}</b><small className="muted">{t("set.startHint")}</small></div>
          <select className="lang" value={startDay} aria-label={t("set.startDay")} onChange={(e) => onStartDay(Number(e.target.value))}>
            {DAYS.map((d) => <option key={d} value={d}>{t("inc.day", { n: d })}</option>)}
          </select>
        </div>
        <div className="set-row">
          <b>{t("set.workoutGoal")}</b>
          <select className="lang" value={workoutGoal} aria-label={t("set.workoutGoal")} onChange={(e) => onWorkoutGoal(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{t("set.perWeek", { n })}</option>)}
          </select>
        </div>
        <div className="set-row">
          <b>{t("set.water")} <small className="muted">(ml)</small></b>
          <GoalInput key={`w${intakeGoals.water}`} value={intakeGoals.water} range={GOAL_RANGE.water} unit="ml" label={t("set.water")} onSave={(n) => onIntakeGoal("water", n)} />
        </div>
        <div className="set-row">
          <b>{t("set.protein")} <small className="muted">(g)</small></b>
          <GoalInput key={`p${intakeGoals.protein}`} value={intakeGoals.protein} range={GOAL_RANGE.protein} unit="g" label={t("set.protein")} onSave={(n) => onIntakeGoal("protein", n)} />
        </div>
      </section>

      <section className="panel">
        <h3>{t("nav.integrations")}</h3>
        <div className="set-row">
          <div><b>{t("set.links")}</b><small className="muted">{t("set.linksDesc")}</small></div>
          <button type="button" className="btn" onClick={() => onOpen("integrations")}>{t("set.manage")}</button>
        </div>
      </section>

      <section className="panel">
        <h3>{t("set.about")}</h3>
        <div className="set-links">
          <Link href="/privacy">{t("legal.privacy")}</Link>
          <Link href="/terms">{t("legal.terms")}</Link>
          {contact && <a href={`mailto:${contact}`}>{t("set.contact")}</a>}
        </div>
        <div className="set-row set-danger">
          <div><b>{t("account.delete")}</b><small className="muted">{t("set.deleteDesc")}</small></div>
          <button type="button" className="btn danger" onClick={onDelete}>{t("account.delete")}</button>
        </div>
      </section>
    </div>
  );
}
