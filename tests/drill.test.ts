import { describe, expect, it } from "vitest";
import { gapCount, shuffleFor } from "@/lib/drill";
import { checkDrill, type RawDrill } from "@/lib/server/ai";

const raw = (over: Partial<RawDrill> = {}): RawDrill => ({
  supported: true,
  reason: "",
  subject: "language",
  task: "Выбери правильный вариант",
  rule: "В некоторых словах пишется двойная согласная. Например: касса, ванна. Такие слова надо запомнить.",
  example_frames: [{ text: "Похожее слово: ка(с, сс)а." }, { text: "Вспоминаем словарное слово." }, { text: "Выбираем вариант." }],
  items: [
    { prompt: "су(б, бб)оту", context: "В су(б, бб)оту наша гру(п, пп)а...", options: ["субботу", "суботу"], correct: 0, hint: "Это словарное слово." },
    { prompt: "гру(п, пп)а", context: "", options: ["группа", "група"], correct: 0, hint: "Правильно — группа." },
    { prompt: "шо(с, сс)е", context: "", options: ["шоссе", "шосе"], correct: 0, hint: "" },
    { prompt: "плохой", context: "", options: ["одно"], correct: 0, hint: "" },
  ],
  ...over,
});

describe("gapCount", () => {
  it("counts choices in brackets and blanks", () => {
    expect(gapCount("В су(б, бб)оту наша гру(п, пп)а")).toBe(2);
    expect(gapCount("к_рова, м_локо, с…бака")).toBe(3);
    expect(gapCount("Сколько будет 35 + 27?")).toBe(0);
    expect(gapCount("__ + 5 = 9, __ - 2 = 3")).toBe(0);
    expect(gapCount("Подумай... и реши... задачу")).toBe(0);
  });
});

describe("shuffleFor", () => {
  it("keeps every item and is the same for one seed", () => {
    expect(shuffleFor(["a", "b", "c"], "x").sort()).toEqual(["a", "b", "c"]);
    expect(shuffleFor(["a", "b", "c"], "seed")).toEqual(shuffleFor(["a", "b", "c"], "seed"));
  });
});

describe("checkDrill", () => {
  it("keeps valid items, drops broken ones, and keeps the right answer after shuffling", () => {
    const r = checkDrill(raw(), "ru");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.drill.items.map((it) => it.prompt)).toEqual(["су(б, бб)оту", "гру(п, пп)а", "шо(с, сс)е"]);
    expect(r.drill.items.map((it) => it.options[it.answer])).toEqual(["субботу", "группа", "шоссе"]);
  });

  it("removes a hint that names the right word", () => {
    const r = checkDrill(raw(), "ru");
    if (!r.ok) throw new Error(r.reason);
    expect(r.drill.items[0].hint).toBe("Это словарное слово.");
    expect(r.drill.items[1].hint).toBeUndefined();
  });

  it("rejects a rule that names a right word", () => {
    const r = checkDrill(raw({ rule: "Запомни: суббота и группа пишутся с двумя согласными." }), "ru");
    expect(r).toEqual({ ok: false, reason: "rule-leak" });
  });

  it("drops example slides that name a right word", () => {
    const r = checkDrill(raw({ example_frames: [{ text: "Например, шоссе." }, { text: "Ещё пример: касса." }] }), "ru");
    if (!r.ok) throw new Error(r.reason);
    expect(r.drill.example).toEqual([]);
  });

  it("needs at least two good items", () => {
    expect(checkDrill(raw({ items: raw().items.slice(3) }), "ru")).toEqual({ ok: false, reason: "few-items" });
  });
});
