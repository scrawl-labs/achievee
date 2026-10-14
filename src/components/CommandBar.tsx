"use client";
import { useEffect, useRef } from "react";
import type { Tab } from "@/lib/commandBar";
import CommandItem from "./CommandItem";
import { useI18n } from "./I18n";
import Icon from "./Icon";
import { useCommandBar } from "./useCommandBar";

const isMac = () => typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform);

/** ⌘K / Ctrl+K palette plus its small header button. Mount once, inside the logged-in app. */
export default function CommandBar({ go }: { go: (tab: Tab, date?: string) => void }) {
  const { t } = useI18n();
  const c = useCommandBar(go);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => { if (c.open) input.current?.focus(); }, [c.open]);
  useEffect(() => {
    if (c.open && c.activeIndex >= 0) list.current?.children[c.activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [c.open, c.activeIndex]);

  const note = c.addFailed ? t(c.addFailed === "todo" ? "cmd.addTodoFail" : "cmd.addFail") : c.searchFailed ? t("cmd.searchFail")
    : c.loading ? t("cmd.searching") : c.items.length === 0 ? t("cmd.none") : null;
  const scopeNote = c.searched && !c.loading && !c.searchFailed ? t("cmd.recent") : null;

  return (
    <>
      <button className="btn icon" onClick={c.show} aria-label={t("cmd.open")} aria-haspopup="dialog" title={t("cmd.open")}><Icon name="search" /></button>
      {c.open && (
        <div className="cmd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) c.close(); }}>
          <div className="cmd" role="dialog" aria-modal="true" aria-label={t("cmd.dialog")} onKeyDown={c.onKeyDown}
            onMouseDown={(e) => { if (e.target !== input.current) e.preventDefault(); }}>
            <input ref={input} className="cmd-input" role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-autocomplete="list"
              aria-label={t("cmd.dialog")} aria-activedescendant={c.activeIndex >= 0 ? `cmd-opt-${c.activeIndex}` : undefined}
              placeholder={t("cmd.placeholder", { key: isMac() ? "⌘K" : "Ctrl K" })} value={c.query} maxLength={250}
              autoComplete="off" spellCheck={false} onChange={(e) => c.setQuery(e.target.value)} />
            <ul id="cmd-list" ref={list} className="cmd-list" role="listbox" aria-label={t("cmd.list")}>
              {c.items.map((item, i) => (
                <CommandItem key={item.id} item={item} id={`cmd-opt-${i}`} active={i === c.activeIndex}
                  onHover={() => c.setActive(i)} onPick={() => void c.run(item)} />
              ))}
            </ul>
            {note && <p className="cmd-note" role="status">{note}</p>}
            {scopeNote && <p className="cmd-note cmd-scope">{scopeNote}</p>}
          </div>
        </div>
      )}
    </>
  );
}
