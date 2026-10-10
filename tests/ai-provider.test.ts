import { afterEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  // Same shape as the real SDK class: new ApiError({ message, status }).
  ApiError: class extends Error {
    status: number;
    constructor(o: { message: string; status: number }) {
      super(o.message);
      this.status = o.status;
    }
  },
  ThinkingLevel: { LOW: "LOW", MINIMAL: "MINIMAL" },
}));

const { buildLesson, provider, readTask } = await import("../lib/server/ai");
const { ApiError } = await import("@google/genai");

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
    // Photo reading uses the fast model with minimal thinking and a time limit.
    expect(req.model).toBe("gemini-flash-lite-latest");
    expect(req.config.thinkingConfig).toEqual({ thinkingLevel: "MINIMAL" });
    expect(req.config.abortSignal).toBeInstanceOf(AbortSignal);
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

  it("falls back to simpler settings when Gemini rejects an option", async () => {
    env({ GEMINI_API_KEY: "g" });
    generateContent
      .mockRejectedValueOnce(new ApiError({ message: "thinking_level not supported", status: 400 }))
      .mockResolvedValueOnce({ text: '```json\n{"readable": true, "tasks": ["8 + 5"]}\n```' });
    const out = await readTask("AAAA", "image/png");
    expect(out.tasks).toEqual(["8 + 5"]);
    expect(generateContent.mock.calls[0][0].config.thinkingConfig).toBeDefined();
    expect(generateContent.mock.calls[1][0].config.thinkingConfig).toBeUndefined();
  });

  it("reports a short error code", async () => {
    env({ GEMINI_API_KEY: "g" });
    generateContent.mockRejectedValue(new ApiError({ message: "API key not valid", status: 403 }));
    await expect(readTask("AAAA", "image/png")).rejects.toMatchObject({ message: "ai_error", code: "gemini-403" });
  });

  it("turns a hung request into a timeout code", async () => {
    env({ GEMINI_API_KEY: "g" });
    const abort = new Error("aborted");
    abort.name = "AbortError";
    generateContent.mockRejectedValue(abort);
    await expect(readTask("AAAA", "image/png")).rejects.toMatchObject({ code: "gemini-timeout" });
  });
});
