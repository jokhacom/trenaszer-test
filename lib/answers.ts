// Comparing word answers: children type with different case, apostrophes,
// ё/е and punctuation — those must not make a right answer wrong.

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/['‘’`ʼʻ]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the child's answer matches one of the accepted answers. */
export function matchesText(answer: string, accepted: string[]): boolean {
  const a = normalizeText(answer);
  return a.length > 0 && accepted.some((x) => normalizeText(x) === a);
}

/**
 * True when `text` contains `answer` as a whole word or phrase. Very short
 * answers (one or two letters) are not checked: they appear in every text.
 */
export function containsText(text: string, answer: string): boolean {
  const a = normalizeText(answer);
  if (a.length < 3) return false;
  return ` ${normalizeText(text)} `.includes(` ${a} `);
}
