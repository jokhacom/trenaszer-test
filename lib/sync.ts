// What the cloud keeps for a family, and how two copies are joined: the
// progress from this phone and the progress already in the cloud (from
// another phone, or from before the parent logged in).

import type { TopicStat } from "./progress";

/** localStorage keys that travel to the cloud. */
export const SYNCED_KEYS = ["mirodil:profile", "mirodil:progress", "mirodil:reading", "mirodil:days", "mirodil:photo"] as const;

export type Snapshot = Partial<Record<(typeof SYNCED_KEYS)[number], unknown>>;

type Counts = Record<string, number>;

/** Field by field, the bigger number: counts only grow, so neither copy loses work. */
function maxCounts(a: unknown, b: unknown): Counts | undefined {
  const x = (a ?? {}) as Counts;
  const y = (b ?? {}) as Counts;
  if (!a && !b) return undefined;
  const out: Counts = {};
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) out[k] = Math.max(Number(x[k]) || 0, Number(y[k]) || 0);
  return out;
}

export function merge(local: Snapshot, remote: Snapshot): Snapshot {
  const out: Snapshot = {};
  // The profile on this phone wins: the child chose it here.
  const profile = local["mirodil:profile"] ?? remote["mirodil:profile"];
  if (profile) out["mirodil:profile"] = profile;

  const lp = (local["mirodil:progress"] ?? {}) as Record<string, TopicStat>;
  const rp = (remote["mirodil:progress"] ?? {}) as Record<string, TopicStat>;
  const progress: Record<string, Counts> = {};
  for (const topic of new Set([...Object.keys(lp), ...Object.keys(rp)])) {
    progress[topic] = maxCounts(lp[topic], rp[topic])!;
  }
  if (Object.keys(progress).length) out["mirodil:progress"] = progress;

  for (const key of ["mirodil:reading", "mirodil:photo"] as const) {
    const m = maxCounts(local[key], remote[key]);
    if (m) out[key] = m;
  }

  const days = [...new Set([...((local["mirodil:days"] as string[]) ?? []), ...((remote["mirodil:days"] as string[]) ?? [])])]
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .slice(-60);
  if (days.length) out["mirodil:days"] = days;
  return out;
}
