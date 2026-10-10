import { describe, expect, it } from "vitest";
import { matchesText } from "../lib/answers";
import { checkLesson, type RawLesson } from "../lib/server/ai";
import { fingerprint } from "../lib/server/store";

const none = { kind: "none", bar_kind: "total", a: 0, b: 0, label_a: "", label_b: "", emoji: "" } as const;
const num = (prompt: string, expect: number) => ({ prompt, kind: "number" as const, expect, options: [] });

const base: RawLesson = {
  supported: true,
  reason: "",
  subject: "math",
  task: "У Азиза 12 конфет, у Малики на 5 больше. Сколько конфет у Малики?",
  topic: "Задачи «на … больше»",
  answer_kind: "number",
  answer_number: 17,
  solution_expression: "12 + 5",
  choices: [],
  correct_choice: 0,
  accepted: [],
  hint: "«На 5 больше» — это столько же и ещё 5.",
  question: num("Сколько конфет у Азиза?", 12),
  example_frames: [
    { text: "Похожая задача: у Бобура 3 шарика, у Мадины на 2 больше.", picture: { ...none, kind: "bar", bar_kind: "more", a: 3, b: 2, label_a: "Бобур", label_b: "Мадина" } },
    { text: "3 + 2 = 5", picture: none },
    { text: "Ответ: 5 шариков.", picture: none },
  ],
  together: [num("Сколько у Азиза?", 12), num("Сложи: 12 + 5 = ?", 17)],
  own_picture: { ...none, kind: "bar", bar_kind: "more", a: 12, b: 5, label_a: "Азиз", label_b: "Малика" },
};

describe("AI lesson check", () => {
  it("accepts a correct lesson with pictures", () => {
    const r = checkLesson(base, "ru");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lesson.own).toEqual({ kind: "bar", spec: { kind: "more", a: 12, b: 5, nameA: "Азиз", nameB: "Малика" } });
    expect(r.lesson.exampleFrames?.[0].visual?.kind).toBe("bar");
    expect(r.lesson.answerKind).toBe("number");
  });

  it("rejects a lesson whose answer does not match its own expression", () => {
    expect(checkLesson({ ...base, answer_number: 18 }, "ru").ok).toBe(false);
  });

  it("removes texts and pictures that would reveal the answer", () => {
    const r = checkLesson(
      {
        ...base,
        hint: "Ответ будет 17.",
        question: num("Будет ли 17?", 17),
        example_frames: [
          { text: "Похожая задача", picture: none },
          { text: "10 + 7 = 17", picture: none },
          { text: "4 + 3 = 7", picture: none },
          { text: "Ответ: 7", picture: none },
        ],
        together: [...base.together, num("Итак, 17?", 17)],
        own_picture: { ...none, kind: "objects", a: 12, b: 5, emoji: "🍬" },
      },
      "ru",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const all = [r.lesson.hint, r.lesson.question.prompt, ...r.lesson.example, ...r.lesson.together.map((s) => s.prompt)];
    expect(all.some((s) => /(?<!\d)17(?!\d)/.test(s))).toBe(false);
    expect(r.lesson.question.expect).not.toBe(17);
    // 12 + 5 objects would show 17 when counted together.
    expect(r.lesson.own).toBeUndefined();
  });

  it("supports choice answers for language tasks", () => {
    const r = checkLesson(
      {
        ...base,
        subject: "language",
        task: "Какое слово пишется с буквой «о»: м_локо?",
        answer_kind: "choice",
        answer_number: 0,
        solution_expression: "",
        choices: ["малоко", "молоко"],
        correct_choice: 1,
        hint: "Подбери проверочное слово.",
        question: { prompt: "Какой звук слышишь в слове «молочный»?", kind: "choice", expect: 0, options: ["о", "а"] },
        example_frames: [
          { text: "Похожее слово: в_да", picture: none },
          { text: "Проверка: воды", picture: none },
        ],
        together: [{ prompt: "Выбери, как пишется слово", kind: "choice", expect: 1, options: ["малоко", "молоко"] }],
        own_picture: none,
      },
      "ru",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lesson.answerKind).toBe("choice");
    expect(r.lesson.choices).toEqual(["малоко", "молоко"]);
    expect(r.lesson.answer).toBe(1);
    expect(r.lesson.question.options?.map((o) => o.label)).toEqual(["о", "а"]);
  });

  it("supports written answers and hides them from hints", () => {
    const r = checkLesson(
      {
        ...base,
        subject: "english",
        task: "How do you say «яблоко» in English?",
        answer_kind: "text",
        answer_number: 0,
        solution_expression: "",
        accepted: ["apple", "an apple"],
        hint: "The word apple starts with A.",
        question: { prompt: "Which letter does the word start with?", kind: "choice", expect: 0, options: ["A", "B"] },
        example_frames: [
          { text: "Similar: «банан» is banana", picture: none },
          { text: "Now say yours!", picture: none },
        ],
        together: [{ prompt: "Pick the picture of the fruit", kind: "choice", expect: 0, options: ["🍎", "🚗"] }],
        own_picture: none,
      },
      "ru",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lesson.hint).not.toMatch(/apple/i);
    expect(matchesText("  Apple! ", r.lesson.accepted!)).toBe(true);
    expect(matchesText("aple", r.lesson.accepted!)).toBe(false);
  });

  it("drops broken steps and refuses lessons without any", () => {
    const r = checkLesson({ ...base, together: [{ prompt: "?", kind: "choice", expect: 5, options: ["a"] }] }, "ru");
    expect(r).toEqual({ ok: false, reason: "no-steps" });
  });

  it("passes unsupported tasks through", () => {
    expect(checkLesson({ ...base, supported: false, reason: "not a school task" }, "ru")).toEqual({ ok: false, reason: "not a school task" });
  });
});

describe("task fingerprint", () => {
  it("ignores case, spaces, punctuation and the task number", () => {
    const a = fingerprint("№5. У Азиза 12 конфет, у Малики на 5 больше.", "ru", 2);
    const b = fingerprint("у азиза 12 конфет у малики на 5 больше", "ru", 2);
    expect(a).toBe(b);
    expect(fingerprint("o‘n", "uz", 1)).toBe(fingerprint("o'n", "uz", 1));
  });
});
