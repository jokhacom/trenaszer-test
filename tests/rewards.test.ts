import { beforeEach, describe, expect, it } from "vitest";
import { helpOrder, preferredHelp } from "@/lib/methods";
import { avatarsFor, award, candiesFor, levelOf, nextLevel, stickersFor } from "@/lib/rewards";

// A tiny localStorage for the tests.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

describe("rewards", () => {
  beforeEach(() => store.clear());

  it("gives the most for solving alone and nothing for giving up", () => {
    expect(candiesFor(true, 0)).toBe(3);
    expect(candiesFor(true, 2)).toBe(2);
    expect(candiesFor(true, 3)).toBe(1);
    expect(candiesFor(false, 3)).toBe(0);
  });

  it("adds a once-a-day bonus, unlocks stickers and levels", () => {
    const first = award(3, "2026-10-16")!;
    expect(first).toMatchObject({ added: 5, total: 5, dayBonus: true, stickers: [] });
    const second = award(3, "2026-10-16")!;
    expect(second).toMatchObject({ added: 3, total: 8, dayBonus: false, stickers: ["🍉"] });
    for (let i = 0; i < 7; i++) award(3, "2026-10-16");
    expect(award(3, "2026-10-17")).toMatchObject({ total: 34, level: "bronze" });
    expect(award(0)).toBeNull();
  });

  it("levels, next level and avatars", () => {
    expect(levelOf(29)).toBe("none");
    expect(levelOf(30)).toBe("bronze");
    expect(levelOf(250)).toBe("gold");
    expect(nextLevel(90)).toEqual({ level: "silver", need: 10 });
    expect(nextLevel(300)).toBeNull();
    expect(avatarsFor(10)).toEqual([]);
    expect(avatarsFor(120)).toEqual(["🐲", "🦄", "🦚", "🐬"]);
    expect(stickersFor(1000).length).toBe(30);
  });
});

describe("kind of help that works", () => {
  it("needs two solved tasks before changing the order", () => {
    expect(preferredHelp({ question: { shown: 1, solved: 1 } })).toBeNull();
    expect(preferredHelp({ question: { shown: 3, solved: 2 }, example: { shown: 5, solved: 2 } })).toBe("question");
  });

  it("puts the best kind first", () => {
    expect(helpOrder(["example", "question", "together"], "together")).toEqual(["together", "example", "question"]);
    expect(helpOrder(["example", "question", "together"], "hint")).toEqual(["example", "question", "together"]);
    expect(helpOrder(["example", "question", "together"], null)).toEqual(["example", "question", "together"]);
  });
});

describe("number bonds", async () => {
  const { answerOf, choicesFor, makeBond } = await import("@/lib/bonds");
  it("makes valid houses for every grade with the answer among three choices", () => {
    for (const g of [1, 2, 3, 4] as const) {
      for (let i = 0; i < 300; i++) {
        const b = makeBond(g);
        expect(b.a).toBeGreaterThan(0);
        expect(b.b).toBeGreaterThan(0);
        expect(b.a + b.b).toBe(b.whole);
        const c = choicesFor(b);
        expect(c).toContain(answerOf(b));
        expect(new Set(c).size).toBe(c.length);
        expect(c.length).toBeGreaterThanOrEqual(2);
        expect(c.every((n) => n > 0)).toBe(true);
      }
    }
    expect(Math.max(...Array.from({ length: 200 }, () => makeBond(1).whole))).toBeLessThanOrEqual(10);
  });
});
