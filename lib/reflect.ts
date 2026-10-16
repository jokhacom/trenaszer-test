// After a solved task the child says how they solved it and how it felt
// (Singapore syllabus: metacognition and self-assessment). Kept per topic for
// the parent report: "says it is hard" is worth knowing.

const KEY = "mirodil:reflect";

export type Way = "picture" | "steps" | "rule" | "guess";
export type Feel = "easy" | "ok" | "hard";

type Counts = Record<string, number>;
type Store = Record<string, Counts>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function bump(key: string, field: string) {
  const s = read();
  s[key] = { ...(s[key] ?? {}), [field]: (s[key]?.[field] ?? 0) + 1 };
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage is off: nothing is kept.
  }
}

export const recordWay = (topic: string, way: Way) => bump(`way:${topic}`, way);
export const recordFeel = (topic: string, feel: Feel) => bump(`feel:${topic}`, feel);

/** Topics the child more often called hard than easy (at least twice). */
export function feltHard(store: Store = read()): string[] {
  return Object.entries(store)
    .filter(([k]) => k.startsWith("feel:"))
    .filter(([, c]) => (c.hard ?? 0) >= 2 && (c.hard ?? 0) > (c.easy ?? 0))
    .map(([k]) => k.slice(5));
}
