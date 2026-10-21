"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./I18n";

export const THEME_KEY = "achievee:theme";
type Mode = "system" | "light" | "dark";

/** Screen mode: follow the system, or force light / dark. Applied as <html data-theme>; layout.tsx sets it before first paint. */
export default function ThemeSelect() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === "light" || v === "dark") setMode(v);
    } catch {}
  }, []);
  const change = (m: Mode) => {
    setMode(m);
    try { m === "system" ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, m); } catch {}
    m === "system" ? document.documentElement.removeAttribute("data-theme") : document.documentElement.setAttribute("data-theme", m);
  };
  return (
    <select className="lang" value={mode} aria-label={t("theme.label")} onChange={(e) => change(e.target.value as Mode)}>
      <option value="system">{t("theme.system")}</option>
      <option value="light">{t("theme.light")}</option>
      <option value="dark">{t("theme.dark")}</option>
    </select>
  );
}
