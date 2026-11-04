import type { SaveResult } from "@/components/EmotionBuddy";

/** What Bori saves: the day, the chosen emotion words and an optional note. */
export type BoriSave = { date: string; ids: string[]; note?: string };

/** Adds Bori's words (and note) to a day's diary without replacing what is there. */
export async function postBoriSave(p: BoriSave): Promise<SaveResult> {
  try {
    const res = await fetch("/api/diary/emotions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: p.date, emotions: p.ids, note: p.note ?? "" }) });
    if (!res.ok) return "error";
    const j = await res.json();
    return { added: j.added ?? [], left: j.left ?? [] };
  } catch { return "error"; }
}
