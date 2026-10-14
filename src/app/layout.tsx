import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Providers from "@/components/Providers";
import { getSession } from "@/lib/auth";
import { HTML_LANG, fromAcceptLanguage, isLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Achievee", appleWebApp: { capable: true, title: "Achievee", statusBarStyle: "default" } };
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, colorScheme: "dark light",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0e0f11" }, { media: "(prefers-color-scheme: light)", color: "#f6f6f7" }], // status bar / title bar of the installed app
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = cookies().get("locale")?.value;
  const locale = isLocale(saved) ? saved : fromAcceptLanguage(headers().get("accept-language"));
  const session = await getSession();
  return (
    <html lang={HTML_LANG[locale]}>
      <body><Providers session={session} locale={locale}>{children}</Providers></body>
    </html>
  );
}
