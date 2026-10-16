// Number bonds ("number houses"): a whole on top, two parts below, one of
// the three hidden. In Singapore this is the base of grades 1–2: seeing a
// number as parts (10 = 7 + 3) makes adding and subtracting easy later.

import type { Grade } from "./types";

export interface Bond {
  whole: number;
  a: number;
  b: number;
  /** Which circle is empty. */
  hide: "a" | "b" | "whole";
}

type Rng = () => number;
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

/** One number house for the grade: within 10, then 20 and tens, hundreds, thousands. */
export function makeBond(grade: Grade, r: Rng = Math.random): Bond {
  let whole: number;
  let a: number;
  const kind = r();
  if (grade === 1) {
    whole = int(r, 3, 10);
    a = int(r, 1, whole - 1);
  } else if (grade === 2) {
    if (kind < 0.5) {
      // Teen numbers as ten and ones, or any split within 20.
      whole = int(r, 11, 20);
      a = kind < 0.25 ? 10 : int(r, 2, whole - 2);
    } else {
      whole = int(r, 3, 10) * 10;
      a = int(r, 1, whole / 10 - 1) * 10;
    }
  } else if (grade === 3) {
    if (kind < 0.5) {
      // Complements to 100: 35 + 65.
      whole = 100;
      a = int(r, 1, 19) * 5;
    } else {
      whole = int(r, 3, 10) * 100;
      a = int(r, 1, whole / 50 - 1) * 50;
    }
  } else {
    if (kind < 0.5) {
      whole = 1000;
      a = int(r, 1, 39) * 25;
    } else {
      whole = int(r, 3, 10) * 1000;
      a = int(r, 1, whole / 500 - 1) * 500;
    }
  }
  const hideRoll = r();
  // Mostly a missing part; sometimes the whole (joining the parts).
  const hide: Bond["hide"] = hideRoll < 0.2 ? "whole" : hideRoll < 0.6 ? "a" : "b";
  return { whole, a, b: whole - a, hide };
}

export const answerOf = (b: Bond) => (b.hide === "whole" ? b.whole : b.hide === "a" ? b.a : b.b);

/** Three choices: the answer and two near misses of the right size, all different and positive. */
export function choicesFor(b: Bond, r: Rng = Math.random): number[] {
  const ans = answerOf(b);
  const step = b.whole <= 20 ? 1 : b.whole <= 100 ? (ans % 10 === 0 ? 10 : 5) : b.whole <= 1000 ? (ans % 100 === 0 ? 100 : 25) : 500;
  const near = [ans - step, ans + step, ans - 2 * step, ans + 2 * step].filter((n) => n > 0 && n !== ans);
  const picked: number[] = [];
  while (picked.length < 2 && near.length) picked.push(near.splice(Math.floor(r() * near.length), 1)[0]);
  const all = [ans, ...picked];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
