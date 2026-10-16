import { describe, expect, it } from "vitest";
import { warmUpFor } from "@/lib/readiness";
import { feltHard } from "@/lib/reflect";
import { answerOf, choicesFor, makeFact, tablesFor } from "@/lib/times";

describe("readiness check", () => {
  it("warms up on the earlier topic before a new one", () => {
    expect(warmUpFor(["addCarry", "mult"], {})).toBe("add10");
    expect(warmUpFor(["addCarry"], { add10: { tries: 3, selfSolved: 2, helpSum: 1 } })).toBeNull();
    // A topic already tried needs no warm-up.
    expect(warmUpFor(["div"], { div: { tries: 1, selfSolved: 0, helpSum: 3 } })).toBeNull();
    expect(warmUpFor(["mult", "add10"], {})).toBeNull();
  });
});

describe("feeling hard", () => {
  it("names topics called hard more often than easy", () => {
    expect(feltHard({ "feel:mult": { hard: 3, easy: 1 }, "feel:add10": { hard: 2, easy: 4 }, "way:mult": { guess: 5 } })).toEqual(["mult"]);
  });
});

describe("times tables", () => {
  it("follows the syllabus by grade and keeps grade 1 within 40", () => {
    expect(tablesFor(2)).toEqual([2, 3, 4, 5, 10]);
    expect(tablesFor(3)).toEqual([6, 7, 8, 9]);
    for (let i = 0; i < 300; i++) {
      const f = makeFact(1, tablesFor(1));
      expect(f.op).toBe("mul");
      expect(f.a * f.b).toBeLessThanOrEqual(40);
    }
  });

  it("always offers the answer among different positive choices", () => {
    for (const g of [1, 2, 3, 4] as const) {
      for (let i = 0; i < 300; i++) {
        const f = makeFact(g, tablesFor(g));
        const c = choicesFor(f);
        expect(c).toContain(answerOf(f));
        expect(new Set(c).size).toBe(c.length);
        expect(c.every((n) => n > 0)).toBe(true);
      }
    }
  });
});
