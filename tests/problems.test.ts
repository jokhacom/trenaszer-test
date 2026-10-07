import { describe, expect, it } from "vitest";
import { evaluate, parseSimpleExample } from "../lib/expression";
import { classifyInput } from "../lib/ladder";
import { containsNumber, lessonFromExample, makeLesson, TOPICS_BY_GRADE } from "../lib/problems";
import { LANGS, type Grade, type Lesson, type Visual } from "../lib/types";

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function visualNumbers(v: Visual | undefined): string[] {
  if (!v) return [];
  if (v.kind === "blocks") return v.rows.map((r) => r.label ?? "");
  if (v.kind === "column") return [v.result ?? ""];
  return [];
}

function checkNoLeak(l: Lesson) {
  const texts = [
    l.hint,
    l.question.prompt,
    ...(l.question.options ?? []).map((o) => o.label),
    ...l.example,
    ...(l.exampleFrames ?? []).flatMap((f) => [f.text, ...visualNumbers(f.visual)]),
    ...visualNumbers(l.own),
    ...l.together.flatMap((st) => visualNumbers(st.visual)),
  ];
  for (const text of texts) {
    expect(containsNumber(text, l.answer), `answer ${l.answer} leaks in "${text}" (task ${l.task})`).toBe(false);
  }
}

describe("built-in lessons", () => {
  for (const grade of [1, 2, 3, 4] as Grade[]) {
    for (const topic of TOPICS_BY_GRADE[grade]) {
      for (const lang of LANGS) {
        it(`grade ${grade} ${topic} ${lang}: no answer in hint, question or example`, () => {
          const r = seeded(grade * 1000 + topic.length * 31 + lang.charCodeAt(0));
          for (let i = 0; i < 300; i++) {
            const l = makeLesson(topic, lang, grade, r);
            checkNoLeak(l);
            expect(l.together.length).toBeGreaterThan(0);
            // Every built-in task has a picture example and a picture of the child's own task.
            expect(l.exampleFrames?.length ?? 0).toBeGreaterThanOrEqual(3);
            expect(l.own).toBeDefined();
            expect(l.answer).toBeGreaterThan(0);
            expect(Number.isInteger(l.answer)).toBe(true);
            // The last "together" step always leads to the child's own answer.
            expect(l.together[l.together.length - 1].expect).toBe(l.answer);
            expect(l.task).not.toMatch(/undefined|NaN|\$\{/);
            for (const s of [l.hint, l.question.prompt, ...l.example, ...l.together.map((x) => x.prompt)]) {
              expect(s).not.toMatch(/undefined|NaN|\$\{/);
            }
          }
        });
      }
    }
  }

  it("word problems carry a bar model", () => {
    const l = makeLesson("wordMore", "ru", 2, seeded(7));
    expect(l.bar?.kind).toBe("more");
  });

  it("Russian word problems agree in number", () => {
    const l = makeLesson("wordTotal", "ru", 1, () => 0);
    expect(l.task).toMatch(/^У \S+ \d+ \S+, у \S+ \d+ \S+\. Сколько \S+ у них всего\?$/);
  });
});

describe("typed examples", () => {
  it("recognises school notation", () => {
    expect(parseSimpleExample("35 + 27 = ?")).toEqual({ a: 35, b: 27, op: "+" });
    expect(parseSimpleExample("6 × 4")).toEqual({ a: 6, b: 4, op: "*" });
    expect(parseSimpleExample("24 : 4 =")).toEqual({ a: 24, b: 4, op: "/" });
    expect(parseSimpleExample("52 − 27")).toEqual({ a: 52, b: 27, op: "-" });
    expect(parseSimpleExample("У Азиза 5 яблок")).toBeNull();
  });

  it("builds ladders for supported examples without leaking the answer", () => {
    for (const [text, topic, answer] of [
      ["8 + 5", "add10", 13],
      ["35 + 27", "addCarry", 62],
      ["52 - 27", "subBorrow", 25],
      ["6 × 4", "mult", 24],
      ["24 : 4", "div", 6],
      ["23 × 4", "mult2d", 92],
    ] as const) {
      for (const lang of LANGS) {
        const l = lessonFromExample(text, lang, 2, seeded(3));
        expect(l, text).not.toBeNull();
        expect(l!.topic).toBe(topic);
        expect(l!.answer).toBe(answer);
        checkNoLeak(l!);
      }
    }
  });

  it("returns null for examples it cannot explain safely", () => {
    expect(lessonFromExample("23 + 14", "ru", 2)).toBeNull(); // no carrying
    expect(lessonFromExample("16 : 4", "ru", 3)).toBeNull(); // answer equals the divisor
    expect(lessonFromExample("7 : 2", "ru", 3)).toBeNull();
  });
});

describe("expression evaluator", () => {
  it("evaluates school arithmetic", () => {
    expect(evaluate("12 + 5")).toBe(17);
    expect(evaluate("(15 - 6) × 2")).toBe(18);
    expect(evaluate("24 : 4 + 1")).toBe(7);
    expect(evaluate("2 + ")).toBeNull();
    expect(evaluate("alert(1)")).toBeNull();
  });
});

describe("child input", () => {
  it("understands numbers and requests for help", () => {
    expect(classifyInput("62")).toEqual({ kind: "number", value: 62 });
    expect(classifyInput("62 яблока")).toEqual({ kind: "number", value: 62 });
    expect(classifyInput("скажи ответ").kind).toBe("askAnswer");
    expect(classifyInput("javobni ayt").kind).toBe("askAnswer");
    expect(classifyInput("не знаю").kind).toBe("stuck");
    expect(classifyInput("bilmayman").kind).toBe("stuck");
    expect(classifyInput("I don't know").kind).toBe("stuck");
    expect(classifyInput("").kind).toBe("empty");
  });
});
