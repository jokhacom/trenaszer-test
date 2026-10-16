// Times tables game (Singapore syllabus: tables of 2, 3, 4, 5, 10 in P2 and
// 6, 7, 8, 9 in P3; multiplying within 40 in P1). Facts the child missed come
// back at the end of the round and at the start of the next one.

import type { Grade } from "./types";

export interface Fact {
  a: number;
  b: number;
  /** "mul": a × b = ?, "div": (a × b) : b = ? */
  op: "mul" | "div";
}

const KEY = "mirodil:facts";
type Rng = () => number;

export function tablesFor(grade: Grade): number[] {
  if (grade === 1) return [2, 5, 10];
  if (grade === 2) return [2, 3, 4, 5, 10];
  if (grade === 3) return [6, 7, 8, 9];
  return [2, 3, 4, 5, 6, 7, 8, 9];
}

export const answerOf = (f: Fact) => (f.op === "mul" ? f.a * f.b : f.a);
export const factKey = (f: Fact) => `${f.op}:${f.a}:${f.b}`;

/** One fact from the chosen tables. Grade 1 stays within 40 and has no division. */
export function makeFact(grade: Grade, tables: number[], r: Rng = Math.random): Fact {
  const b = tables[Math.floor(r() * tables.length)];
  const max = grade === 1 ? Math.min(4, Math.floor(40 / b)) : 10;
  const a = 1 + Math.floor(r() * max);
  const op = grade >= 2 && r() < 0.3 ? "div" : "mul";
  return { a, b, op };
}

/** Three choices: the answer and the facts next to it (one group more or less), which are the usual slips. */
export function choicesFor(f: Fact, r: Rng = Math.random): number[] {
  const ans = answerOf(f);
  const near = (f.op === "mul" ? [ans - f.b, ans + f.b, ans - 1, ans + 1] : [ans - 1, ans + 1, ans + 2]).filter(
    (n) => n > 0 && n !== ans,
  );
  const picked: number[] = [];
  while (picked.length < 2 && near.length) picked.push(near.splice(Math.floor(r() * near.length), 1)[0]);
  const all = [ans, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/** Facts missed earlier, to start the next round with. */
export function missedFacts(): Fact[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Fact[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function saveMissed(facts: Fact[]) {
  const unique = [...new Map(facts.map((f) => [factKey(f), f])).values()].slice(0, 10);
  try {
    localStorage.setItem(KEY, JSON.stringify(unique));
  } catch {
    // Storage is off: missed facts are not kept between rounds.
  }
}
