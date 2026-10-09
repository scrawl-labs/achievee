"use client";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { Locale } from "@/lib/i18n";
import { I18nProvider } from "./I18n";

export default function Providers({ children, session, locale }: { children: React.ReactNode; session: Session | null; locale: Locale }) {
  // The server already knows the session, so useSession() is authenticated from the first render (no "loading" waterfall).
  return <SessionProvider session={session}><I18nProvider initial={locale}>{children}</I18nProvider></SessionProvider>;
}
