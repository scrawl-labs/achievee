"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GoalScope } from "@/lib/goals";
import { mondayOf } from "@/lib/dates";
import { todayStr } from "@/lib/clientTime";
import {
  type HitType, type SearchHit, type Tab, TABS, defaultActiveIndex, filterCommands, hitTarget, isImeEvent, isPaletteShortcut, moveIndex,
  parseDateInput, parseGoalCommand, parseSearchResponse, searchQuery,
} from "@/lib/commandBar";
import type { Key } from "@/lib/i18n";
import { useI18n } from "./I18n";
import type { IconName } from "./Icon";
import { invalidate } from "./useApi";

type Action =
  | { type: "tab"; tab: Tab }
  | { type: "today" }
  | { type: "date"; date: string }
  | { type: "goal"; scope: GoalScope; text: string }
  | { type: "hit"; hit: SearchHit };
export type CmdItem = { id: string; icon: IconName; label: string; hint?: string; action: Action };

type Found = { q: string; ok: boolean; hits: SearchHit[] };
const DEBOUNCE_MS = 400;
const RETRY_MS = 1000; // server 429s carry Retry-After: 1
const HIT_ICON: Record<HitType, IconName> = { goal: "check", diary: "book", expense: "wallet", income: "plus", saving: "chart", workout: "activity" };
const hitLabel = (h: SearchHit): Key => (h.type === "goal" && h.scope === "week" ? "cmd.t.weekGoal" : `cmd.t.${h.type}`);

/** State and behaviour of the command bar; `go` moves the app to a tab and/or a selected date. */
export function useCommandBar(go: (tab: Tab, date?: string) => void) {
  const { t, fmt } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQueryRaw] = useState("");
  const [active, setActive] = useState<number | null>(null); // null: the user has not moved, use the default
  const [found, setFound] = useState<Found | null>(null);
  const [addFailed, setAddFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const session = useRef(0); // bumped on every open/close so a slow POST cannot act on a newer session
  const posting = useRef(false);

  const show = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    session.current += 1;
    setQueryRaw(""); setActive(null); setAddFailed(false); setFound(null); setOpen(true);
  }, []);
  const close = useCallback(() => {
    session.current += 1;
    setOpen(false);
    opener.current?.focus();
  }, []);
  const setQuery = useCallback((q: string) => { setQueryRaw(q); setActive(null); setAddFailed(false); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isPaletteShortcut(e)) return;
      e.preventDefault();
      if (open) close(); else show();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, close]);

  // Debounced search; a late response of an older query is dropped (abort + `q` check when rendering).
  useEffect(() => {
    const q = searchQuery(query);
    if (!open || !q) return;
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const fetchHits = async (retried: boolean) => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        if (r.status === 429 && !retried) { timer = setTimeout(() => void fetchHits(true), RETRY_MS); return; } // rate limited: not an error, try once more
        if (!r.ok) throw new Error(String(r.status));
        setFound({ q, ok: true, hits: parseSearchResponse(await r.json()) });
      } catch {
        if (!ctl.signal.aborted) setFound({ q, ok: false, hits: [] });
      }
    };
    timer = setTimeout(() => void fetchHits(false), DEBOUNCE_MS);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [open, query]);

  const q = searchQuery(query);
  const current = q !== null && found?.q === q ? found : null;
  const loading = q !== null && current === null;

  const items = useMemo<CmdItem[]>(() => {
    const today = todayStr();
    const day = (iso: string) => (iso.slice(0, 4) === today.slice(0, 4) ? fmt.monthDay(iso) : fmt.date(iso));
    const date = parseDateInput(query, today);
    const goal = parseGoalCommand(query);
    const commands = [
      ...TABS.map((tb) => ({ id: `tab:${tb.key}`, icon: tb.icon as IconName, label: t(tb.label), action: { type: "tab", tab: tb.key } as Action })),
      ...(date === today ? [] : [{ id: "today", icon: "calendar" as IconName, label: t("cmd.goToday"), keywords: "today", action: { type: "today" } as Action }]),
    ];
    return [
      ...(date ? [{ id: `date:${date}`, icon: "calendar" as IconName, label: t("cmd.goDate", { date: day(date) }), action: { type: "date", date } as Action }] : []),
      ...(goal ? [
        { id: "goal:day", icon: "plus" as IconName, label: t("cmd.addDay", { text: goal }), action: { type: "goal", scope: "day", text: goal } as Action },
        { id: "goal:week", icon: "plus" as IconName, label: t("cmd.addWeek", { text: goal }), action: { type: "goal", scope: "week", text: goal } as Action },
      ] : []),
      ...filterCommands(commands, query),
      ...(current?.hits ?? []).map((hit, i) => ({
        id: `hit:${i}`, icon: HIT_ICON[hit.type], label: hit.title, hint: `${t(hitLabel(hit))} · ${day(hit.date)}`, action: { type: "hit", hit } as Action,
      })),
    ];
  }, [query, current, t, fmt]);

  const activeIndex = active === null ? defaultActiveIndex(items.map((i) => i.action.type === "goal")) : Math.min(active, items.length - 1);

  const run = useCallback(async (item: CmdItem) => {
    const a = item.action;
    if (a.type === "goal") {
      if (posting.current) return; // double click / Enter+click: one POST
      posting.current = true;
      const sid = session.current;
      const today = todayStr();
      setBusy(true);
      setAddFailed(false);
      let saved = false;
      try {
        const r = await fetch("/api/goals", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: a.scope, period_start: a.scope === "week" ? mondayOf(today) : today, text: a.text }),
        });
        if (!r.ok) throw new Error(String(r.status));
        saved = true;
      } catch { /* reported below, only if this session is still the one on screen */ }
      posting.current = false;
      setBusy(false);
      if (saved) invalidate("/api/goals");
      if (sid !== session.current) return; // closed (or reopened) meanwhile: leave the current UI alone
      if (saved) close(); else setAddFailed(true);
      return;
    }
    if (a.type === "tab") go(a.tab);
    else if (a.type === "today") go("calendar", todayStr());
    else if (a.type === "date") go("calendar", a.date);
    else { const target = hitTarget(a.hit); go(target.tab, target.date); }
    close();
  }, [go, close]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isImeEvent(e.nativeEvent)) return;
    if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive(moveIndex(activeIndex, e.key === "ArrowDown" ? 1 : -1, items.length)); }
    else if (e.key === "Enter") { e.preventDefault(); if (!busy && items[activeIndex]) void run(items[activeIndex]); }
    else if (e.key === "Tab") e.preventDefault(); // the input is the only tab stop: options use aria-activedescendant
  }, [activeIndex, items, busy, run, close]);

  return {
    open, show, close, query, setQuery, items, activeIndex, setActive, run, onKeyDown,
    loading, searched: q !== null, searchFailed: current !== null && !current.ok, addFailed, busy,
  };
}
