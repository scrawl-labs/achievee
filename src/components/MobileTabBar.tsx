"use client";
import { useEffect, useRef, useState } from "react";
import { MORE_TABS, PRIMARY_TABS, type Tab } from "@/lib/commandBar";
import { useI18n } from "./I18n";
import Icon from "./Icon";

/** Phone navigation: the four tabs used most, then "More" with the rest. The wide-screen sidebar keeps listing every tab. */
export default function MobileTabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const inMore = MORE_TABS.some((m) => m.key === tab);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <nav className="tabbar">
      {PRIMARY_TABS.map((tb) => (
        <button key={tb.key} className={tab === tb.key && !open ? "on" : ""} aria-current={tab === tb.key ? "page" : undefined} onClick={() => { setOpen(false); setTab(tb.key); }}>
          <Icon name={tb.icon} /><span>{t(tb.label)}</span>
        </button>
      ))}
      <div className="moretab" ref={box}>
        <button className={inMore || open ? "on" : ""} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="more" /><span>{t("nav.more")}</span>
        </button>
        {open && (
          <div className="more-sheet" role="menu">
            {MORE_TABS.map((tb) => (
              <button key={tb.key} role="menuitem" className={tab === tb.key ? "on" : ""} onClick={() => { setOpen(false); setTab(tb.key); }}>
                <Icon name={tb.icon} /><span>{t(tb.label)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
