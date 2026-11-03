"use client";
import Link from "next/link";
import LanguageSelect from "./LanguageSelect";
import ThemeSelect from "./ThemeSelect";
import { useI18n } from "./I18n";

/**
 * Footer of the public pages (landing, privacy, terms): legal links on the left, screen mode and language on the right. Signed-in accounts use Settings instead.
 * The landing page is always light, so it leaves the screen-mode select out (`theme={false}`).
 */
export default function Footer({ theme = true }: { theme?: boolean }) {
  const { t } = useI18n();
  return (
    <footer className="appfoot">
      <nav className="appfoot-links">
        <Link href="/privacy">{t("legal.privacy")}</Link>
        <Link href="/terms">{t("legal.terms")}</Link>
      </nav>
      <div className="appfoot-end">
        {theme && <ThemeSelect />}
        <LanguageSelect />
      </div>
    </footer>
  );
}
