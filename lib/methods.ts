// Which kind of help works for this child. When a child gets stuck, the
// ladder tries a similar example with pictures, a hint, a leading question or
// solving together. The app counts after which kind of help the child
// solved the task, and next time starts with the one that works best.

const KEY = "mirodil:methods";

export type Method = "example" | "hint" | "question" | "together";
type Stats = Partial<Record<Method, { shown: number; solved: number }>>;

function read(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stats) : {};
  } catch {
    return {};
  }
}

/**
 * After a task: every kind of help that was shown, and the one the child
 * solved after (the last one shown), if the task was solved.
 */
export function recordHelp(shown: Method[], solved: boolean) {
  if (shown.length === 0) return;
  const s = read();
  for (const m of shown) {
    const cur = s[m] ?? { shown: 0, solved: 0 };
    s[m] = { shown: cur.shown + 1, solved: cur.solved + (solved && m === shown[shown.length - 1] ? 1 : 0) };
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage is off: the default order is used.
  }
}

/** The kind of help that worked best, once there is enough evidence (2+ tasks solved after it). */
export function preferredHelp(stats: Stats = read()): Method | null {
  let best: Method | null = null;
  let bestRate = 0;
  for (const [m, v] of Object.entries(stats) as [Method, { shown: number; solved: number }][]) {
    if (!v || v.solved < 2) continue;
    const rate = v.solved / Math.max(v.shown, 1);
    if (rate > bestRate) {
      best = m;
      bestRate = rate;
    }
  }
  return best;
}

/** The order of help for one task: the child's best kind first, then the usual order. */
export function helpOrder(usual: Method[], preferred: Method | null): Method[] {
  if (!preferred || !usual.includes(preferred)) return usual;
  return [preferred, ...usual.filter((m) => m !== preferred)];
}
