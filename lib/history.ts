// "My tasks": every task the child got help with, so it can be opened again
// later — on this phone or, after the parent logs in, on another one. The
// lesson itself stays in the cloud lesson store under `key`, so opening it
// again costs no AI call.

import { saveSynced } from "./progress";
import type { Grade, Lang } from "./types";

export const HISTORY_KEY = "mirodil:history";
export const HISTORY_MAX = 60;

export interface HistoryEntry {
  id: string;
  /** Milliseconds since 1970. */
  at: number;
  title: string;
  /** The task text, to build the lesson again if the saved one is gone. */
  text: string;
  lang: Lang;
  grade: Grade;
  mode?: "drill";
  /** Where the lesson is saved in the cloud lesson store. */
  key?: string;
  solved?: boolean;
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Joins two lists: one entry per task, the newest first; solved on either side counts. */
export function mergeHistory(a: HistoryEntry[], b: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const e of [...a, ...b]) {
    if (!e || typeof e.id !== "string" || typeof e.text !== "string") continue;
    const old = byId.get(e.id);
    byId.set(e.id, old ? { ...(old.at >= e.at ? old : e), solved: Boolean(old.solved || e.solved) } : e);
  }
  return [...byId.values()].sort((x, y) => y.at - x.at).slice(0, HISTORY_MAX);
}

/** The same task (same text, kind, language and grade) keeps one entry. */
const idFor = (e: Pick<HistoryEntry, "text" | "mode" | "lang" | "grade">) =>
  `${e.lang}|${e.grade}|${e.mode ?? "lesson"}|${e.text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 300)}`;

export function addToHistory(e: Omit<HistoryEntry, "id" | "at">): string {
  const entry: HistoryEntry = { ...e, id: idFor(e), at: Date.now() };
  const old = loadHistory().find((x) => x.id === entry.id);
  saveSynced(HISTORY_KEY, mergeHistory([{ ...entry, solved: Boolean(old?.solved) }], loadHistory().filter((x) => x.id !== entry.id)));
  return entry.id;
}

export function markSolved(id: string) {
  const list = loadHistory();
  if (!list.some((x) => x.id === id && !x.solved)) return;
  saveSynced(
    HISTORY_KEY,
    list.map((x) => (x.id === id ? { ...x, solved: true } : x)),
  );
}
