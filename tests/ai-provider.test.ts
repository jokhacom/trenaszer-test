import { afterEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  ApiError: class extends Error {
    status = 0;
  },
}));

const { buildLesson, provider, readTask } = await import("../lib/server/ai");

const KEYS = ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "GEMINI_API_KEY", "AI_PROVIDER"];
function env(vars: Record<string, string>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
}

afterEach(() => {
  env({});
  generateContent.mockReset();
});

describe("AI provider choice", () => {
  it("uses whichever key is set, Claude first", () => {
    env({});
    expect(provider()).toBeNull();
    env({ GEMINI_API_KEY: "g" });
    expect(provider()).toBe("gemini");
    env({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" });
    expect(provider()).toBe("claude");
    env({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a", AI_PROVIDER: "gemini" });
    expect(provider()).toBe("gemini");
    env({ ANTHROPIC_API_KEY: "a", AI_PROVIDER: "gemini" });
    expect(provider()).toBe("claude");
  });
});

describe("Gemini requests", () => {
  it("sends the photo with a JSON schema and reads the tasks", async () => {
    env({ GEMINI_API_KEY: "g" });
    generateContent.mockResolvedValue({ text: JSON.stringify({ readable: true, tasks: [" 35 + 27 ", ""] }) });
    const out = await readTask("AAAA", "image/jpeg");
    expect(out).toEqual({ readable: true, tasks: ["35 + 27"] });
    const req = generateContent.mock.calls[0][0];
    expect(req.contents[0].parts[0]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "AAAA" } });
    expect(req.config.responseMimeType).toBe("application/json");
    expect(req.config.responseJsonSchema).toBeDefined();
    expect(req.config.systemInstruction).toContain("Transcribe");
  });

  it("checks the lesson the same way as for Claude", async () => {
    env({ GEMINI_API_KEY: "g" });
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        supported: true,
        reason: "",
        task: "12 + 5 = ?",
        topic: "Сложение",
        answer: 17,
        solution_expression: "12 + 5",
        hint: "Ответ 17.",
        question: { prompt: "Сколько единиц: 2 + 5?", expect: 7 },
        example: ["Похожий пример: 11 + 3", "11 + 3 = 14"],
        together: [{ prompt: "Сложи: 12 + 5 = ?", expect: 17 }],
      }),
    });
    const r = await buildLesson("12 + 5 + ничего", "ru", 2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lesson.hint).not.toContain("17");
  });
});
