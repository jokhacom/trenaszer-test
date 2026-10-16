import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

// The lesson route must not reach the AI when a saved lesson is opened again.
const buildLesson = vi.fn(async () => {
  throw new Error("the AI must not be called");
});
vi.mock("@/lib/server/ai", () => ({
  aiEnabled: () => true,
  AiError: class extends Error {},
  buildLesson,
  buildDrill: buildLesson,
}));

const { addToHistory, loadHistory, markSolved, mergeHistory } = await import("@/lib/history");

describe("My tasks", () => {
  beforeEach(() => store.clear());

  it("keeps one entry per task, newest first, and remembers solved", () => {
    const a = addToHistory({ title: "Яблоки", text: "У Азиза 8 яблок", lang: "ru", grade: 2, key: "k1" });
    addToHistory({ title: "Груши", text: "У Малики 5 груш", lang: "ru", grade: 2 });
    markSolved(a);
    addToHistory({ title: "Яблоки", text: "у азиза  8 яблок", lang: "ru", grade: 2, key: "k1" });
    const list = loadHistory();
    expect(list.map((e) => e.title)).toEqual(["Яблоки", "Груши"]);
    expect(list[0].solved).toBe(true);
  });

  it("joins two phones' lists", () => {
    const one = { id: "x", at: 1, title: "A", text: "a", lang: "ru" as const, grade: 2 as const };
    const two = { id: "y", at: 2, title: "B", text: "b", lang: "ru" as const, grade: 2 as const };
    expect(mergeHistory([{ ...one, solved: true }], [{ ...one, at: 3 }, two]).map((e) => [e.id, e.solved ?? false])).toEqual([
      ["x", true],
      ["y", false],
    ]);
  });
});

describe("opening a saved lesson", () => {
  it("returns the saved lesson by its key without asking the AI", async () => {
    const { putLesson } = await import("@/lib/server/store");
    const lesson = { id: "ai:x", topic: "other", lang: "ru", task: "t", answer: 3, hint: "h", question: { prompt: "q", expect: 1 }, example: [], together: [], source: "ai" };
    await putLesson("v1|old-key", lesson as never);
    const { POST } = await import("@/app/api/lesson/route");
    const res = await POST(
      new Request("http://test/api/lesson", {
        method: "POST",
        body: JSON.stringify({ text: "какая-то задача про яблоки", lang: "ru", grade: 2, key: "v1|old-key" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ lesson: { id: "ai:x" }, key: "v1|old-key", cached: true });
    expect(buildLesson).not.toHaveBeenCalled();
  });
});
