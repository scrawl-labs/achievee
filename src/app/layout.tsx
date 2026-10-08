import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = { title: "Achievee" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
