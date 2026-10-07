import { describe, expect, it } from "vitest";
import { checkLesson } from "../lib/server/ai";
import { fingerprint } from "../lib/server/store";

const base = {
  supported: true,
  reason: "",
  task: "У Азиза 12 конфет, у Малики на 5 больше. Сколько конфет у Малики?",
  topic: "Задачи «на … больше»",
  answer: 17,
  solution_expression: "12 + 5",
  hint: "«На 5 больше» — это столько же и ещё 5.",
  question: { prompt: "Сколько конфет у Азиза?", expect: 12 },
  example: ["Похожая задача: у Бобура 3 шарика, у Мадины на 2 больше.", "3 + 2 = 5", "Ответ: 5 шариков."],
  together: [
    { prompt: "Сколько у Азиза?", expect: 12 },
    { prompt: "Сложи: 12 + 5 = ?", expect: 17 },
  ],
};

describe("AI lesson check", () => {
  it("accepts a correct lesson", () => {
    const r = checkLesson(base, "ru");
    expect(r.ok).toBe(true);
  });

  it("rejects a lesson whose answer does not match its own expression", () => {
    const r = checkLesson({ ...base, answer: 18 }, "ru");
    expect(r.ok).toBe(false);
  });

  it("removes texts that would reveal the answer", () => {
    const r = checkLesson(
      {
        ...base,
        hint: "Ответ будет 17.",
        question: { prompt: "Будет ли 17?", expect: 17 },
        example: ["Похожая задача", "10 + 7 = 17", "4 + 3 = 7"],
        together: [...base.together, { prompt: "Итак, 17?", expect: 17 }],
      },
      "ru",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const all = [r.lesson.hint, r.lesson.question.prompt, ...r.lesson.example, ...r.lesson.together.map((s) => s.prompt)];
    expect(all.some((s) => /(?<!\d)17(?!\d)/.test(s))).toBe(false);
    expect(r.lesson.question.expect).not.toBe(17);
  });

  it("passes unsupported tasks through", () => {
    const r = checkLesson({ ...base, supported: false, reason: "not a school task" }, "ru");
    expect(r).toEqual({ ok: false, reason: "not a school task" });
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
