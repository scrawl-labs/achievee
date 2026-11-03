"use client";
import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/components/I18n";
import EmotionBuddy from "@/components/EmotionBuddy";
export default function P() {
  const [v, setV] = useState<string[]>([]);
  return (
    <SessionProvider session={{ user: { name: "소현" }, expires: "2099-01-01" }} refetchOnWindowFocus={false}>
      <I18nProvider initial="ko">
        <div style={{ maxWidth: 640, margin: "24px auto", padding: 16 }}><EmotionBuddy value={v} onChange={setV} onBrowse={() => {}} /></div>
      </I18nProvider>
    </SessionProvider>
  );
}
