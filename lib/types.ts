export type Lang = "uz" | "ru" | "en";
export const LANGS: Lang[] = ["uz", "ru", "en"];

export type Grade = 1 | 2 | 3 | 4;

/** School subjects the AI can help with (built-in tasks are all maths). */
export type Subject = "math" | "language" | "reading" | "english" | "world";

/**
 * How the child gives the final answer: a number, a choice among options
 * (`answer` is then the index of the right option), or a word or phrase
 * checked against `accepted`.
 */
export type AnswerKind = "number" | "choice" | "text";

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
  visual?: Visual;
}

/** A row of place-value blocks: tens as rods, ones as cubes. */
export interface BlockRow {
  label?: string;
  tens: number;
  ones: number;
  /** Rods / cubes shown crossed out (taken away). */
  crossTens?: number;
  crossOnes?: number;
  /** Ring around the first 10 cubes: "10 ones make 1 ten". */
  ringTen?: boolean;
  /** How many of the cubes came from breaking a ten (drawn in another colour). */
  fromTen?: number;
}

/**
 * Pictures for the concrete → pictorial → abstract steps. They show the
 * numbers of a task, never the answer of the child's own task.
 */
export type Visual =
  | { kind: "blocks"; rows: BlockRow[] }
  /** Column method. `result` uses "?" for empty boxes, `carry` is the small digit over the tens. */
  | { kind: "column"; a: number; b: number; op: "+" | "−" | "×"; result?: string; carry?: string }
  /** Ten frames for "make 10": a dots, b dots, `move` dots moved into the first frame. */
  | { kind: "tenframe"; a: number; b: number; move?: number }
  | { kind: "groups"; groups: number; each: number; emoji: string }
  /** Loose objects; with `crossed`, that many from the end are crossed out. */
  | { kind: "objects"; emoji: string; counts: number[]; crossed?: number }
  | { kind: "bar"; spec: BarSpec };

/** One slide of a solved example: a short sentence and a picture. */
export interface Frame {
  text: string;
  visual?: Visual;
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
  /** Default "number". */
  answerKind?: AnswerKind;
  /** Options for answerKind "choice"; `answer` is the right index. */
  choices?: string[];
  /** Accepted spellings for answerKind "text". */
  accepted?: string[];
  subject?: Subject;
  hint: string;
  question: Step;
  example: string[];
  /** The same example as slides with pictures (built-in tasks). */
  exampleFrames?: Frame[];
  /** The child's own task as a picture, without the answer. */
  own?: Visual;
  together: Step[];
  bar?: BarSpec;
  source: "local" | "ai";
}
