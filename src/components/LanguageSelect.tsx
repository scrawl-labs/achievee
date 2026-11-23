"use client";
import { Select } from "@achievee/ui";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { useI18n } from "./I18n";

export default function LanguageSelect({ size = "sm", className = "lang" }: { size?: "md" | "sm"; className?: string } = {}) {
  const { locale, setLocale, t } = useI18n();
  return (
    <Select size={size} className={className} value={locale} aria-label={t("account.language")} onChange={(e) => setLocale(e.target.value as Locale)}>
      {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l]}</option>)}
    </Select>
  );
}
