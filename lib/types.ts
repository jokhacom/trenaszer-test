export type Lang = "uz" | "ru" | "en";
export const LANGS: Lang[] = ["uz", "ru", "en"];

export type Grade = 1 | 2 | 3 | 4;

export type Topic =
  | "add10"
  | "addCarry"
  | "subBorrow"
  | "wordTotal"
  | "wordRemain"
  | "wordMore"
  | "wordLess"
  | "mult"
  | "div"
  | "mult2d";

/** One interactive step: the child answers with a number or picks an option. */
export interface Step {
  prompt: string;
  expect: number;
  /** When set, the child picks one of these instead of typing. */
  options?: { label: string; value: number }[];
}

/** Bar model of a word problem (Singapore model method). */
export interface BarSpec {
  kind: "total" | "remain" | "more" | "less";
  a: number;
  b: number;
  nameA: string;
  nameB: string;
}

/**
 * A task with its help ladder. The final answer is stored only to check the
 * child's input; no ladder text may contain it.
 */
export interface Lesson {
  id: string;
  topic: Topic | "other";
  lang: Lang;
  task: string;
  answer: number;
  hint: string;
  question: Step;
  example: string[];
  together: Step[];
  bar?: BarSpec;
  source: "local" | "ai";
}
