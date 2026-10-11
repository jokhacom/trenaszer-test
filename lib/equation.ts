// Showing an equation the way a child reads it in a textbook: on its own
// line, never broken in the middle.

const EQ = /(\(?\d[\d\s ]*\)?(?:\s*[+\-−×·*:/]\s*\(?\d[\d\s ]*\)?)+\s*=\s*(?:\d[\d\s ]*|\?))\.?\s*$/;

/** "Прибавляем 50. 300 + 50 = 350." → { words: "Прибавляем 50.", equation: "300 + 50 = 350" } */
export function splitEquation(text: string): { words: string; equation?: string } {
  const m = text.match(EQ);
  if (!m || m.index === undefined) return { words: text };
  const words = text.slice(0, m.index).trim();
  const equation = m[1].replace(/\s+/g, " ").trim();
  return words ? { words, equation } : { words: "", equation };
}
