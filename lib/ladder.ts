import type { Lang } from "./types";

/**
 * Help ladder levels. Each level gives more help than the one before, but no
 * level gives the answer to the child's own task. "hint" replaces "example"
 * when a task has no solved example (some AI-built lessons).
 */
export type Level = "try" | "example" | "hint" | "question" | "together";

/** Wrong answers in a row on one level before the ladder steps up by itself. */
export const WRONG_BEFORE_STEP_UP = 2;

export type Input =
  | { kind: "number"; value: number }
  | { kind: "askAnswer" }
  | { kind: "stuck" }
  | { kind: "empty" }
  | { kind: "other" };

const ASK_ANSWER = [
  // ru
  "ответ", "скажи", "подскажи ответ", "реши за меня", "реши сам",
  // uz
  "javob", "yechib ber", "o‘zing yech",
  // en
  "answer", "tell me", "just say", "solve it for me",
];

const STUCK = [
  // ru
  "не знаю", "незнаю", "не понимаю", "не понял", "не поняла", "трудно", "сложно", "надоело", "не могу", "помоги",
  // uz
  "bilmayman", "bilmadim", "tushunmadim", "tushunmayapman", "qiyin", "zerikdim", "qila olmayman", "yordam",
  // en
  "don't know", "dont know", "idk", "don't understand", "dont understand", "hard", "boring", "can't", "cant", "help", "give up",
];

/** Children type o‘ as o', o` or o’ — treat them all the same. */
const apostrophes = (s: string) => s.replace(/['‘’`ʼʻ]/g, "'");

export function classifyInput(raw: string): Input {
  const s = apostrophes(raw.trim().toLowerCase());
  if (!s) return { kind: "empty" };
  const m = s.match(/^[^\d-]*(-?\d+(?:[.,]\d+)?)[^\d]*$/);
  if (m) return { kind: "number", value: Number(m[1].replace(",", ".")) };
  if (ASK_ANSWER.some((w) => s.includes(apostrophes(w)))) return { kind: "askAnswer" };
  if (STUCK.some((w) => s.includes(apostrophes(w)))) return { kind: "stuck" };
  return { kind: "other" };
}

export function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

/** Picks a phrase so repeated messages don't sound robotic. */
export function vary<T>(xs: T[], seed: number): T {
  return xs[Math.abs(seed) % xs.length];
}

export type Lang3<T> = Record<Lang, T>;
