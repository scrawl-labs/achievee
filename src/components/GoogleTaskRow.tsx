"use client";
import { useI18n } from "./I18n";

/** A Google task in the day panel's task list: read-only (the checkbox only shows the state), with the "Google" pill. Only the title is struck through. */
export default function GoogleTaskRow({ title, done }: { title: string; done: boolean }) {
  const { t } = useI18n();
  const text = title || t("common.untitled");
  return (
    <li className={`goal${done ? " done" : ""}`}>
      <input type="checkbox" checked={done} disabled readOnly aria-label={text} />
      <span className="goal-text ro">{text}</span>
      <span className="tk-src" aria-hidden="true">Google</span>
      <span className="sr-only">{t("task.google")}</span>
    </li>
  );
}
