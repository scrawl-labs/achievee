import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Providers from "@/components/Providers";
import { getSession } from "@/lib/auth";
import { fromAcceptLanguage, isLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Achievee" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark light" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const saved = cookies().get("locale")?.value;
  const locale = isLocale(saved) ? saved : fromAcceptLanguage(headers().get("accept-language"));
  const session = await getSession();
  return (
    <html lang={locale}>
      <body><Providers session={session} locale={locale}>{children}</Providers></body>
    </html>
  );
}
