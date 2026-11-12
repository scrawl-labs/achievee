"use client";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { Currency, Locale } from "@/lib/i18n";
import { I18nProvider } from "./I18n";
import RegisterSW from "./RegisterSW";

export default function Providers({ children, session, locale, currency }: { children: React.ReactNode; session: Session | null; locale: Locale; currency?: Currency }) {
  // The server already knows the session, so useSession() is authenticated from the first render (no "loading" waterfall).
  return <SessionProvider session={session}><I18nProvider initial={locale} initialCurrency={currency}>{children}<RegisterSW /></I18nProvider></SessionProvider>;
}
