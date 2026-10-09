"use client";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18n";

export default function LanguageSelect() {
  const { locale, setLocale, t } = useI18n();
  return (
    <select className="lang" value={locale} aria-label={t("account.language")} onChange={(e) => setLocale(e.target.value as Locale)}>
      {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
    </select>
  );
}
