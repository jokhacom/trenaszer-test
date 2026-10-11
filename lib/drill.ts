// Helpers for "one rule + a mini-game" (see Drill in types.ts).

/**
 * How many gaps a task has: choices in brackets ("су(б, бб)оту") or blanks
 * ("к_рова", "o‘qi…"). Two or more gaps of one kind → a mini-game.
 */
export function gapCount(text: string): number {
  const choices = text.match(/\(\s*[^(),\s]{1,5}\s*[,/]\s*[^(),\s]{1,5}\s*\)/g)?.length ?? 0;
  // A blank inside a word: "к_рова", "с…бака". Maths blanks ("__ + 5") and
  // ellipses in sentences ("Подумай... и") are not counted.
  const blanks = text.match(/\p{L}_+\p{L}?|_+\p{L}|\p{L}(?:…|\.{2,3})\p{L}/gu)?.length ?? 0;
  return Math.max(choices, blanks);
}

/** Order of options without the right one always first, but the same every time for one word. */
export function shuffleFor<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
