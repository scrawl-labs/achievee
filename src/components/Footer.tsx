"use client";
import Link from "next/link";
import LanguageSelect from "./LanguageSelect";
import ThemeSelect from "./ThemeSelect";
import { useI18n } from "./I18n";

/** Footer of the public pages (landing, privacy, terms): legal links on the left, screen mode and language on the right. Signed-in accounts use Settings instead. */
export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="appfoot">
      <nav className="appfoot-links">
        <Link href="/privacy">{t("legal.privacy")}</Link>
        <Link href="/terms">{t("legal.terms")}</Link>
      </nav>
      <div className="appfoot-end">
        <ThemeSelect />
        <LanguageSelect />
      </div>
    </footer>
  );
}
