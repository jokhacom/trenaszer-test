// AI calls (Claude or Gemini). Server-only: the API key never reaches the browser.
//
// Cost rules (README → "Экономия на AI"):
// 1. Each new task is sent to the AI once; its ladder is cached and reused.
// 2. The long system prompts are identical on every request and cached.
// 3. The model is set per job, so cheaper models can take simple jobs later.

import Anthropic from "@anthropic-ai/sdk";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { evaluate } from "../expression";
import { containsNumber } from "../problems";
import { containsText } from "../answers";
import { gapCount, shuffleFor } from "../drill";
import type { AnswerKind, BarSpec, Drill, DrillItem, Frame, Grade, Lang, Lesson, Step, Subject, Visual } from "../types";

/** Claude is the backup for a busy Gemini: the cheapest model is enough. */
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";

/** Models that can hand a declined request to another model on the server; Haiku cannot. */
const SERVER_FALLBACK = new Set(["claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"]);
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
/** Reading a photo is mostly transcription: a faster, lighter model is enough. */
export const GEMINI_READ_MODEL = process.env.GEMINI_READ_MODEL || "gemini-flash-lite-latest";

/** One AI job: reading a photo is quick and light, building a lesson needs more thought. */
interface Job {
  kind: "read" | "lesson";
  /** Time limit for the whole job, below the hosting limit (maxDuration). */
  budgetMs: number;
  /** Use the smarter model and think more: a second try after a quick read found nothing. */
  strong?: boolean;
}
const READ_JOB: Job = { kind: "read", budgetMs: 50_000 };
// Together with READ_JOB it stays below the hosting limit (maxDuration = 120 s).
const READ_AGAIN_JOB: Job = { kind: "read", budgetMs: 60_000, strong: true };
const LESSON_JOB: Job = { kind: "lesson", budgetMs: 100_000 };

type Provider = "claude" | "gemini";

const hasClaude = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const hasGemini = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Which AI the site uses: AI_PROVIDER if set. Otherwise Gemini (free) when its
 * key exists, else Claude. Without any key the site works with built-in tasks only.
 */
export function provider(): Provider | null {
  const wanted = process.env.AI_PROVIDER?.toLowerCase();
  if (wanted === "gemini" && hasGemini()) return "gemini";
  if (wanted === "claude" && hasClaude()) return "claude";
  return hasGemini() ? "gemini" : hasClaude() ? "claude" : null;
}

/**
 * When Gemini is the main AI, Claude answers if Gemini is busy or its free
 * quota is used up. Not when AI_PROVIDER=gemini forces Gemini only.
 */
function backup(): Provider | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase() === "gemini";
  return provider() === "gemini" && hasClaude() && !forced ? "claude" : null;
}

export function aiEnabled(): boolean {
  return provider() !== null;
}

let claudeClient: Anthropic | null = null;
let geminiClient: GoogleGenAI | null = null;

const LANG_NAME: Record<Lang, string> = { uz: "Uzbek (Latin script)", ru: "Russian", en: "English" };

const STYLE = `Writing rules for every text a child will read:
- The reader is a child aged 7–10. One sentence = one thought. Short, familiar words. A new term is explained at once with an example.
- Friendly, calm tone. Never scold, never say the child is slow.
- Uzbek: Latin alphabet as in school textbooks, spelling per the imlo.uz dictionary, o‘ and g‘ written with ‘ (U+2018), tutuq belgisi ʼ (U+02BC).
- Russian: style of "Пиши, сокращай" and "Ясно, понятно" (Ильяхов): no bureaucratic words, no filler, the main thing first, simple to complex. Prefer present tense so the text fits both boys and girls.
- English: plain English (Oxford Guide to Plain English), vocabulary at CEFR A1–A2.
- Maths: in school ":" is the division sign. Never put a colon after a number or before an equation; write a full stop instead ("Прибавляем 50. 300 + 50 = 350."). Write division with spaces: "12 : 3". Write big numbers in groups: "15 621".`;

const READ_SYSTEM = `You read photos of homework for primary-school children (grades 1–4) in Uzbekistan.
Transcribe every school task you can see in the photo exactly as written, keeping its original language and numbers. Printed or handwritten text may be in Uzbek, Russian or English.
The photo may be turned sideways or upside down, slightly blurred, or have shadows: read it anyway. Only set readable to false when you really cannot read the text.
Transcribe the printed task only. Ignore pencil or pen marks a child has already made (circled or underlined choices, written answers): keep every printed choice, e.g. "су(б, бб)оту", never the choice the child marked.
- One array item per task. "text" is the full task. Keep the task number if there is one ("№5. ...").
- "title" is a very short name of the question for a button, 2–5 words, in the language given by the user (e.g. "Расстояние до Нукуса", "Nukusgacha masofa", "Distance to Nukus").
- If one task asks several questions (for example, distances to several cities), make one item per question. Each item must be complete on its own: repeat the shared condition and write the numbers the child needs, including numbers that are shown only in a picture, diagram, number line or table (describe them in words, e.g. "Posts stand every 10 km; the post before Samarkand shows 150").
- An exercise with many gaps or choices of one kind (insert a letter, choose the right spelling, put words in the right form): ONE item for the whole exercise with gaps = true. Text: the instruction, then the whole text with every gap exactly as printed ("Выбери правильный вариант. В су(б, бб)оту наша гру(п, пп)а..."). Title: the topic ("Двойные согласные"). For every other task gaps = false.
- Do not solve anything and do not add hints.
- If the photo is not a school task, or it is unreadable, set readable to false and return an empty list.
${STYLE}`;

const LESSON_SYSTEM = `You are Mirodil, a patient tutor for primary-school children (grades 1–4) in Uzbekistan.
The product's main rule: the AI never does the homework for the child. It never gives the answer to the child's own task — not in a hint, not in a question, not in an example, not in a picture. The child must find the answer.

You receive one task, sometimes with a photo of the textbook page. Use the photo to read numbers and words from pictures, diagrams, number lines, tables and texts. Subjects: maths, mother tongue and Russian (letters, spelling, words, grammar), reading (questions about a text), English, and "the world around us" (nature, people, safety).

First decide how the child will give the final answer (answer_kind):
- "number": a single number (most maths). Fill answer_number and solution_expression.
- "choice": the child picks one of 2–4 short options (choose a word, a letter, true/false, which animal…). Fill choices and correct_choice (0-based). Shuffle the options; the right one must not always be first.
- "text": the child writes a short word or phrase (a missing letter, a word in the right form, an English word). Fill accepted with every correct spelling (2–5 variants if several are right).
For spelling with a choice of letters ("су(б, бб)оту"), use "choice" with the full words as options ("суботу", "субботу"), never single letters. Never write the correct word in the hint, question, steps or pictures; explain the rule on a different word.
If the task has several gaps, teach the first one only and set the answer for it.
Fill the fields of the other kinds with empty values.

Build a help ladder. The app shows the steps one by one, only when the child asks for help:
1. hint — a direction: where to look, what to start with, which rule to remember.
2. question — one leading question. kind "number" (expect = the number) or kind "choice" (options and expect = index of the right option). It must not reveal the final answer.
3. example_frames — a similar but SIMPLER task with DIFFERENT, small, round numbers or other words, solved in full as 3–5 short slides. The first slide names it as a similar example and shows it as a picture. Each next slide is ONE action: first say what we do and why, in words, then the equation ("Сумму увеличиваем на 50 — значит, прибавляем. 300 + 50 = 350."). No numbering like "1)" or "2)". Its result must differ from the child's answer.
4. together — 2–6 small steps through the child's own task. Each step is kind "number" or kind "choice". The child does every step. The last step leads to the final answer, but its prompt must not state it.

Teaching approach (Singapore primary education): concrete → pictorial → abstract. Start from objects or a picture, then numbers or rules. For maths word problems think in parts and wholes (bar model). Strategies: draw a model, act it out, look for a pattern, work backwards, solve a simpler problem. For reading, send the child back to the right place in the text. For language, show the rule on a similar word.
Ask "why", not only "how": the child should understand the reason for the action.
For word problems, the hint or the question also reminds the child to check that the answer makes sense in the story (can a girl have 500 apples? should the result be bigger or smaller?).
Similar examples use everyday life in Uzbekistan: sums in so‘m, the bazaar, the mahalla, school, saving money, saving water; names like Aziz, Malika, Bobur, Dilnoza.

Words that change the action — when the task has them, the hint or the first slide explains the difference on a picture:
- "увеличить на 5" / "5 ga oshirish" / "increase by 5" = add (+); "уменьшить на 5" = subtract (−);
- "увеличить в 3 раза" / "3 marta oshirish" / "3 times more" = multiply (×); "уменьшить в 3 раза", "втрое" = divide (:).

Pictures (picture objects; kind "none" only when a picture cannot help). In maths give EVERY example slide a picture and fill own_picture — children understand a picture before numbers:
- "bar": bar model: bar_kind total (two parts a and b, the whole unknown; also "a increased by b"), remain (a, then b taken away; also "a decreased by b"), more (b more than a), less (b fewer than a), times (a taken b times; "a increased b times"; b from 2 to 10), share (a split into b equal parts; "a decreased b times"; b from 2 to 10). a and b are numbers from the task, label_a and label_b are short names.
- "objects": up to 30 small objects; a and b are two groups; emoji is one emoji for the object.
- "groups": multiplication or division; a groups with b objects each; emoji for the object.
own_picture shows the child's own task and must never show its answer. Each example slide may have a picture of the example.

other_way: shown only AFTER the child has solved the task. Another way to solve the same task in 1–3 short sentences (count on vs make a ten; a bar model vs an equation; check with the opposite operation). Singapore teaches more than one strategy. Empty when there is no other sensible way.

Also return:
- task: the task text, cleaned up, in the output language.
- topic: a short topic name in the output language.
- subject: math, language, reading, english or world.
- solution_expression (only for "number"): one arithmetic expression with only digits, + - * / ( ) that evaluates to the answer, e.g. "(15 - 6) * 2". The app uses it to check your answer.

Set supported to false (and fill the other fields with empty values) when:
- it is not a school task for grades 1–4, or it is unsafe or unrelated to studies;
- the answer cannot be checked as one number, one choice or a short word (drawings, essays, opinions);
- the task text is unclear.
In "reason" explain briefly in the output language.

Write every text in the output language given by the user, even if the task is in another language — except in English tasks, where the English words the child must learn stay in English.
${STYLE}`;

const READ_SCHEMA = {
  type: "object",
  properties: {
    readable: { type: "boolean" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, text: { type: "string" }, gaps: { type: "boolean" } },
        required: ["title", "text", "gaps"],
        additionalProperties: false,
      },
    },
  },
  required: ["readable", "tasks"],
  additionalProperties: false,
};

const STEP_SCHEMA = {
  type: "object",
  properties: {
    prompt: { type: "string" },
    kind: { type: "string", enum: ["number", "choice"] },
    expect: { type: "number" },
    options: { type: "array", items: { type: "string" } },
  },
  required: ["prompt", "kind", "expect", "options"],
  additionalProperties: false,
};

const PICTURE_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["none", "bar", "objects", "groups"] },
    bar_kind: { type: "string", enum: ["total", "remain", "more", "less", "times", "share"] },
    a: { type: "integer" },
    b: { type: "integer" },
    label_a: { type: "string" },
    label_b: { type: "string" },
    emoji: { type: "string" },
  },
  required: ["kind", "bar_kind", "a", "b", "label_a", "label_b", "emoji"],
  additionalProperties: false,
};

const LESSON_SCHEMA = {
  type: "object",
  properties: {
    supported: { type: "boolean" },
    reason: { type: "string" },
    subject: { type: "string", enum: ["math", "language", "reading", "english", "world"] },
    task: { type: "string" },
    topic: { type: "string" },
    answer_kind: { type: "string", enum: ["number", "choice", "text"] },
    answer_number: { type: "number" },
    solution_expression: { type: "string" },
    choices: { type: "array", items: { type: "string" } },
    correct_choice: { type: "integer" },
    accepted: { type: "array", items: { type: "string" } },
    hint: { type: "string" },
    question: STEP_SCHEMA,
    example_frames: {
      type: "array",
      items: {
        type: "object",
        properties: { text: { type: "string" }, picture: PICTURE_SCHEMA },
        required: ["text", "picture"],
        additionalProperties: false,
      },
    },
    together: { type: "array", items: STEP_SCHEMA },
    own_picture: PICTURE_SCHEMA,
    other_way: { type: "string" },
  },
  required: [
    "supported", "reason", "subject", "task", "topic", "answer_kind", "answer_number", "solution_expression",
    "choices", "correct_choice", "accepted", "hint", "question", "example_frames", "together", "own_picture", "other_way",
  ],
  additionalProperties: false,
};

export interface Input {
  image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
  /** A file already in Gemini's file store (a textbook PDF). Gemini only. */
  file?: { uri: string; mimeType: string };
  text: string;
}

/** Gemini is busy (overloaded) or its free quota is used up: a quick error worth a backup. */
const geminiBusy = (e: unknown) => e instanceof ApiError && [429, 500, 503, 504].includes(e.status);

async function ask(system: string, input: Input, schema: Record<string, unknown>, job: Job, use = provider()): Promise<unknown> {
  try {
    return use === "gemini" ? await askGemini(system, input, schema, job) : await askClaude(system, input, schema, job);
  } catch (e) {
    // A slow timeout is not retried: the hosting limit would already be over.
    if (use === "gemini" && geminiBusy(e) && backup() === "claude") {
      console.warn(`Gemini busy (${(e as ApiError).status}), answering with Claude`);
      try {
        return await askClaude(system, input, schema, job);
      } catch (e2) {
        throw toAiError(e2, "claude");
      }
    }
    throw toAiError(e, use);
  }
}

function toAiError(e: unknown, use: Provider | null): AiError {
  if (e instanceof AiError) return e;
  if (e instanceof Anthropic.APIConnectionTimeoutError || (e instanceof Error && e.name === "AbortError")) {
    return new AiError("ai_error", `${use}-timeout`, e);
  }
  if (e instanceof Anthropic.RateLimitError || (e instanceof ApiError && e.status === 429)) return new AiError("limit");
  // A short code the child's parent can send us; the details stay in the server log.
  if (e instanceof ApiError) return new AiError("ai_error", `gemini-${e.status}`, e);
  if (e instanceof Anthropic.APIError) return new AiError("ai_error", `claude-${e.status ?? "net"}`, e);
  if (e instanceof SyntaxError) return new AiError("ai_error", "bad-json", e);
  return new AiError("ai_error", "unknown", e);
}

async function askClaude(system: string, input: Input, schema: Record<string, unknown>, job: Job): Promise<unknown> {
  claudeClient ??= new Anthropic();
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.image) content.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.data } });
  content.push({ type: "text", text: input.text });
  const response = await claudeClient.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // Identical on every request, so it is read from the prompt cache.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
    output_config: { effort: job.kind === "read" && !job.strong ? "low" : "medium", format: { type: "json_schema", schema } },
    // Server-side fallback if the model declines a request (sending it to Haiku is an error).
    ...(SERVER_FALLBACK.has(CLAUDE_MODEL) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  }, { timeout: job.budgetMs, maxRetries: 0 });
  if (response.stop_reason === "refusal") throw new AiError("refused");
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
  if (!text) throw new AiError("empty");
  return JSON.parse(text.text);
}

async function askGemini(system: string, input: Input, schema: Record<string, unknown>, job: Job): Promise<unknown> {
  geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // When Google's model is overloaded (503) or out of free quota (429), the
  // other model usually still answers: the lighter one is faster, the main one smarter.
  const quick = job.kind === "read" && !job.strong;
  const models = quick ? [GEMINI_READ_MODEL, GEMINI_MODEL] : [GEMINI_MODEL, GEMINI_READ_MODEL];
  let m = 0;
  const parts: ({ inlineData: { mimeType: string; data: string } } | { fileData: { fileUri: string; mimeType: string } } | { text: string })[] = [];
  if (input.image) parts.push({ inlineData: { mimeType: input.image.mediaType, data: input.image.data } });
  if (input.file) parts.push({ fileData: { fileUri: input.file.uri, mimeType: input.file.mimeType } });
  parts.push({ text: input.text });
  const fields = JSON.stringify(schema);
  // Settings differ between Gemini versions. Try the fastest setup first and
  // fall back to simpler ones if the model rejects an option (HTTP 400).
  const thinkingLevel = quick ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW;
  const configs = [
    { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: schema, thinkingConfig: { thinkingLevel } },
    { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: schema },
    { systemInstruction: `${system}\n\nAnswer with JSON only, matching this JSON schema:\n${fields}`, responseMimeType: "application/json" },
  ];
  // The whole job, including retries, must finish before the hosting cuts it off.
  const deadline = Date.now() + job.budgetMs;
  for (let i = 0; ; ) {
    const model = models[m];
    const left = deadline - Date.now();
    if (left < 5_000) throw new AiError("ai_error", "gemini-timeout");
    const started = Date.now();
    try {
      const response = await geminiClient.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: { ...configs[i], abortSignal: AbortSignal.timeout(left) },
      });
      console.info(`Gemini ${model} ${job.kind} answered in ${Date.now() - started} ms (config ${i})`);
      const text = response.text;
      if (!text) throw new AiError(response.promptFeedback?.blockReason ? "refused" : "empty", "gemini-empty");
      return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch (e) {
      if (e instanceof ApiError && e.status === 400 && i < configs.length - 1) {
        console.warn(`Gemini ${model} rejected config ${i}, trying a simpler one:`, e.message);
        i++;
        continue;
      }
      if (e instanceof ApiError && [429, 500, 503, 504].includes(e.status) && m < models.length - 1 && models[m + 1] !== model) {
        console.warn(`Gemini ${model} is busy (${e.status}), trying ${models[m + 1]}`);
        m++;
        continue;
      }
      if (e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError")) {
        throw new AiError("ai_error", "gemini-timeout", e);
      }
      throw e;
    }
  }
}

export class AiError extends Error {
  constructor(
    message: string,
    /** Short code shown to the user, e.g. "gemini-403". */
    readonly code?: string,
    cause?: unknown,
  ) {
    super(message, { cause });
  }
}

export interface ReadTask {
  /** Short name for a button: "Расстояние до Нукуса". */
  title: string;
  /** Full task text sent to the help ladder. */
  text: string;
  /** Many gaps of one kind: taught as "one rule + a mini-game". */
  gaps?: boolean;
}

export async function readTask(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  lang: Lang = "ru",
): Promise<{ readable: boolean; tasks: ReadTask[] }> {
  const out = (await ask(
    READ_SYSTEM,
    { image: { data: imageBase64, mediaType }, text: `Transcribe the tasks in this photo. Language for titles: ${LANG_NAME[lang]}.` },
    READ_SCHEMA,
    READ_JOB,
  )) as { readable: boolean; tasks: (ReadTask | string)[] };
  const first = cleanTasks(out);
  if (first.readable && first.tasks.length > 0) return first;
  // The quick read found nothing (a sideways photo, small print): one more careful try.
  return cleanTasks(
    (await ask(
      READ_SYSTEM,
      { image: { data: imageBase64, mediaType }, text: `Look carefully, the photo may be rotated. Transcribe the tasks in this photo. Language for titles: ${LANG_NAME[lang]}.` },
      READ_SCHEMA,
      READ_AGAIN_JOB,
    )) as { readable: boolean; tasks: (ReadTask | string)[] },
  );
}

function cleanTasks(out: { readable: boolean; tasks: (ReadTask | string)[] }): { readable: boolean; tasks: ReadTask[] } {
  const tasks = (out.tasks ?? [])
    // Some models return plain strings despite the schema; accept both.
    .map((x) => (typeof x === "string" ? { title: "", text: x } : x))
    .map((x): ReadTask => {
      const text = (x.text ?? "").trim();
      const gaps = Boolean(x.gaps) || gapCount(text) >= 2;
      return { title: (x.title ?? "").trim(), text, ...(gaps ? { gaps } : {}) };
    })
    .filter((x) => x.text)
    .slice(0, 20);
  return { readable: Boolean(out.readable), tasks };
}

interface RawStep {
  prompt: string;
  kind: "number" | "choice";
  expect: number;
  options: string[];
}

interface RawPicture {
  kind: "none" | "bar" | "objects" | "groups";
  bar_kind: BarSpec["kind"];
  a: number;
  b: number;
  label_a: string;
  label_b: string;
  emoji: string;
}

export interface RawLesson {
  supported: boolean;
  reason: string;
  subject: Subject;
  task: string;
  topic: string;
  answer_kind: AnswerKind;
  answer_number: number;
  solution_expression: string;
  choices: string[];
  correct_choice: number;
  accepted: string[];
  hint: string;
  question: RawStep;
  example_frames: { text: string; picture: RawPicture }[];
  together: RawStep[];
  own_picture: RawPicture;
  other_way?: string;
}

const GENERIC_HINT: Record<Lang, string> = {
  uz: "Masalani yana bir bor o‘qi: nima maʼlum va nimani topish kerak?",
  ru: "Прочитай задачу ещё раз: что известно и что нужно найти?",
  en: "Read the problem again: what do we know, and what do we need to find?",
};

export type LessonResult = { ok: true; lesson: Lesson } | { ok: false; reason: string };

export async function buildLesson(task: string, lang: Lang, grade: Grade, image?: Input["image"]): Promise<LessonResult> {
  const raw = (await ask(
    LESSON_SYSTEM,
    { image, text: `Output language: ${LANG_NAME[lang]}\nGrade: ${grade}\nTask:\n${task}` },
    LESSON_SCHEMA,
    LESSON_JOB,
  )) as RawLesson;
  return checkLesson(raw, lang);
}

/**
 * In school ":" means division. A colon stuck to a word or number right
 * before an equation ("на 50: 300 + 50") reads like "50 divided by 300", so
 * it becomes a full stop. Division itself is written with spaces ("12 : 3").
 */
export function tidy(text: string): string {
  return text.replace(/([\p{L}\d]):[ \t]+(?=[\d(])/gu, "$1. ");
}

/** Turns the AI's step into an app step; null if it is broken. */
function toStep(st: RawStep): Step | null {
  if (!st?.prompt?.trim()) return null;
  st = { ...st, prompt: tidy(st.prompt) };
  if (st.kind === "choice") {
    const options = (st.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (options.length < 2 || !Number.isInteger(st.expect) || st.expect < 0 || st.expect >= options.length) return null;
    return { prompt: st.prompt, expect: st.expect, options: options.map((label, value) => ({ label, value })) };
  }
  return Number.isFinite(st.expect) ? { prompt: st.prompt, expect: st.expect } : null;
}

const okInt = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;

/** Turns the AI's picture into a Visual the app can draw; undefined if unsafe or broken. */
export function toVisual(p: RawPicture | undefined): Visual | undefined {
  if (!p || p.kind === "none") return undefined;
  const emoji = [...(p.emoji ?? "").trim()].slice(0, 2).join("") || "⭐";
  const pieces = p.bar_kind === "times" || p.bar_kind === "share";
  if (
    p.kind === "bar" &&
    okInt(p.a, 1, 10_000_000) &&
    (pieces ? okInt(p.b, 2, 10) : okInt(p.b, 1, 10_000_000)) &&
    ["total", "remain", "more", "less", "times", "share"].includes(p.bar_kind)
  ) {
    return { kind: "bar", spec: { kind: p.bar_kind, a: p.a, b: p.b, nameA: p.label_a.slice(0, 20), nameB: p.label_b.slice(0, 20) } };
  }
  if (p.kind === "objects" && okInt(p.a, 0, 30) && okInt(p.b, 0, 30) && p.a + p.b > 0 && p.a + p.b <= 30) {
    return { kind: "objects", emoji, counts: [p.a, p.b].filter((n) => n > 0) };
  }
  if (p.kind === "groups" && okInt(p.a, 1, 10) && okInt(p.b, 1, 12)) {
    return { kind: "groups", groups: p.a, each: p.b, emoji };
  }
  return undefined;
}

/** Numbers a picture shows, to make sure it never shows the answer. */
function pictureNumbers(v: Visual | undefined): number[] {
  if (!v) return [];
  if (v.kind === "bar") {
    const { kind, a, b } = v.spec;
    // The bar shows a and b; times / share also invite the product or the part.
    return kind === "times" ? [a, b, a * b] : kind === "share" ? [a, b, a / b] : [a, b];
  }
  if (v.kind === "objects") return [...v.counts, v.counts.reduce((x, y) => x + y, 0)];
  if (v.kind === "groups") return [v.groups, v.each, v.groups * v.each];
  return [];
}

/**
 * The app does not take the AI's word for it: a numeric answer is recomputed
 * from the expression, and any text or picture that would reveal the answer
 * is removed.
 */
export function checkLesson(raw: RawLesson, lang: Lang): LessonResult {
  if (!raw.supported) return { ok: false, reason: raw.reason };
  const kind: AnswerKind = ["number", "choice", "text"].includes(raw.answer_kind) ? raw.answer_kind : "number";

  let answer = 0;
  let choices: string[] | undefined;
  let accepted: string[] | undefined;
  let leaks: (s: string) => boolean;
  if (kind === "number") {
    const computed = evaluate(raw.solution_expression);
    if (computed === null || !Number.isFinite(raw.answer_number) || Math.abs(computed - raw.answer_number) > 1e-9) {
      return { ok: false, reason: "answer-check-failed" };
    }
    answer = raw.answer_number;
    leaks = (s) => containsNumber(s, answer);
  } else if (kind === "choice") {
    choices = (raw.choices ?? []).map((c) => c.trim()).filter(Boolean);
    if (choices.length < 2 || !okInt(raw.correct_choice, 0, choices.length - 1)) return { ok: false, reason: "bad-choices" };
    answer = raw.correct_choice;
    const right = choices[answer];
    leaks = (s) => containsText(s, right);
  } else {
    accepted = (raw.accepted ?? []).map((c) => c.trim()).filter(Boolean);
    if (accepted.length === 0) return { ok: false, reason: "no-accepted" };
    const words = accepted;
    leaks = (s) => words.some((w) => containsText(s, w));
  }

  const together = (raw.together ?? [])
    .map(toStep)
    .filter((st): st is Step => st !== null && !leaks(st.prompt));
  if (together.length === 0) return { ok: false, reason: "no-steps" };

  let question = toStep(raw.question);
  if (!question || leaks(question.prompt) || (kind === "number" && !question.options && question.expect === answer)) {
    question = together.find((st) => kind !== "number" || st.options || st.expect !== answer) ?? together[0];
  }

  const frames: Frame[] = (raw.example_frames ?? [])
    .filter((f) => f?.text?.trim() && !leaks(f.text))
    .map((f) => ({ ...f, text: tidy(f.text) }))
    .map((f) => {
      const visual = toVisual(f.picture);
      // An example picture must not happen to show the child's numeric answer either.
      const safe = !(kind === "number" && pictureNumbers(visual).includes(answer));
      return safe && visual ? { text: f.text, visual } : { text: f.text };
    });

  let own = toVisual(raw.own_picture);
  if (own && kind === "number" && pictureNumbers(own).includes(answer)) own = undefined;

  return {
    ok: true,
    lesson: {
      id: `ai:${raw.task}`,
      topic: "other",
      lang,
      subject: raw.subject,
      task: raw.task,
      answer,
      answerKind: kind,
      choices,
      accepted,
      hint: leaks(raw.hint) ? GENERIC_HINT[lang] : tidy(raw.hint),
      question,
      example: frames.length >= 2 ? frames.map((f) => f.text) : [],
      exampleFrames: frames.length >= 2 ? frames : undefined,
      own,
      together,
      // Shown after the child solved it, so it may use the task's numbers.
      otherWay: raw.other_way?.trim() ? tidy(raw.other_way.trim()) : undefined,
      source: "ai",
    },
  };
}

// ---- "One rule + a mini-game" for exercises with many gaps of one kind ----

const DRILL_SYSTEM = `You are Mirodil, a patient tutor for primary-school children (grades 1–4) in Uzbekistan.
The product's main rule: the AI never does the homework for the child. The child must choose every answer.

You receive an exercise with many gaps or choices of one kind (for example: choose б or бб in fifteen words), sometimes with a photo of the page. Turn it into one short lesson and a mini-game:
- rule: the rule behind the exercise in 2–4 short, simple sentences, explained on words that are NOT in the exercise. If the exercise mixes several rules, name each briefly.
- example_frames: 3–4 short slides working through one similar word that is NOT in the exercise: look at the word, recall the rule, choose.
- items: one item per gap, in the order of the text (at most 25):
  - prompt: the word with its gap exactly as printed ("су(б, бб)оту");
  - context: the sentence it is in, with the gaps as printed;
  - options: 2–4 FULL words, one per variant ("суботу", "субботу") — never single letters;
  - correct: the index of the right option (0-based); check it carefully;
  - hint: one short nudge for this word if the child chooses wrong (which rule, what to listen to or to check, a related word). Never the right word itself.
Never write any right word in rule, example_frames or hints.
Set supported to false when the exercise is not like this (it has no gaps or choices, or the answers are not words), and explain briefly in reason.

Write every text in the output language given by the user, except the words of the exercise, which stay as printed.
${STYLE}`;

const DRILL_SCHEMA = {
  type: "object",
  properties: {
    supported: { type: "boolean" },
    reason: { type: "string" },
    subject: { type: "string", enum: ["math", "language", "reading", "english", "world"] },
    task: { type: "string" },
    rule: { type: "string" },
    example_frames: {
      type: "array",
      items: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          context: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correct: { type: "integer" },
          hint: { type: "string" },
        },
        required: ["prompt", "context", "options", "correct", "hint"],
        additionalProperties: false,
      },
    },
  },
  required: ["supported", "reason", "subject", "task", "rule", "example_frames", "items"],
  additionalProperties: false,
};

export interface RawDrill {
  supported: boolean;
  reason: string;
  subject: Subject;
  task: string;
  rule: string;
  example_frames: { text: string }[];
  items: { prompt: string; context: string; options: string[]; correct: number; hint: string }[];
}

export type DrillResult = { ok: true; drill: Drill } | { ok: false; reason: string };

export async function buildDrill(task: string, lang: Lang, grade: Grade, image?: Input["image"]): Promise<DrillResult> {
  const raw = (await ask(
    DRILL_SYSTEM,
    { image, text: `Output language: ${LANG_NAME[lang]}\nGrade: ${grade}\nExercise:\n${task}` },
    DRILL_SCHEMA,
    LESSON_JOB,
  )) as RawDrill;
  return checkDrill(raw, lang);
}

/**
 * Checks the AI's mini-game: every item needs real options and a valid right
 * index, and no rule, slide or hint may contain a right word.
 */
export function checkDrill(raw: RawDrill, lang: Lang): DrillResult {
  if (!raw.supported) return { ok: false, reason: raw.reason || "unsupported" };
  const items: DrillItem[] = [];
  for (const it of raw.items ?? []) {
    const options = (it.options ?? []).map((o) => o.trim()).filter(Boolean);
    if (!it.prompt?.trim() || options.length < 2 || options.length > 4 || !okInt(it.correct, 0, options.length - 1)) continue;
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) continue;
    // Shuffle here too: models like to put the right word first.
    const right = options[it.correct];
    const shuffled = shuffleFor(options, it.prompt);
    items.push({
      prompt: it.prompt.trim(),
      context: it.context?.trim() || undefined,
      options: shuffled,
      answer: shuffled.indexOf(right),
      hint: it.hint?.trim() || undefined,
    });
  }
  if (items.length < 2) return { ok: false, reason: "few-items" };
  items.splice(25);

  const rights = items.map((it) => it.options[it.answer]);
  const leaks = (s: string) => rights.some((w) => containsText(s, w));
  if (!raw.rule?.trim() || leaks(raw.rule)) return { ok: false, reason: "rule-leak" };
  for (const it of items) if (it.hint && leaks(it.hint)) it.hint = undefined;
  const example: Frame[] = (raw.example_frames ?? [])
    .map((f) => f?.text?.trim())
    .filter((text): text is string => !!text && !leaks(text))
    .map((text) => ({ text }));

  return {
    ok: true,
    drill: {
      id: `drill:${raw.task}`,
      lang,
      subject: raw.subject,
      task: raw.task?.trim() || items.map((it) => it.prompt).join(", "),
      rule: raw.rule.trim(),
      example: example.length >= 2 ? example : [],
      items,
    },
  };
}

// ---- Textbooks: the PDF is kept in Gemini's file store and searched by page and number ----

/** Textbooks need Gemini: it reads a whole PDF from its file store. */
export const booksAiEnabled = () => Boolean(process.env.GEMINI_API_KEY);

function gemini(): GoogleGenAI {
  geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return geminiClient;
}

export interface AiFile {
  name: string;
  uri: string;
  /** Gemini keeps uploaded files for 48 hours; after that the PDF is sent again. */
  expires: Date;
  ready: boolean;
}

function toAiFile(f: { name?: string; uri?: string; expirationTime?: string; state?: string }): AiFile {
  if (f.state === "FAILED") throw new AiError("ai_error", "book-file-failed");
  if (!f.name || !f.uri) throw new AiError("ai_error", "book-file-missing");
  return { name: f.name, uri: f.uri, expires: new Date(f.expirationTime ?? Date.now() + 47 * 3600_000), ready: f.state === "ACTIVE" };
}

export async function uploadBookFile(pdf: Blob, title: string): Promise<AiFile> {
  return toAiFile(await gemini().files.upload({ file: pdf, config: { mimeType: "application/pdf", displayName: title.slice(0, 100) } }));
}

export async function bookFileState(name: string): Promise<AiFile> {
  return toAiFile(await gemini().files.get({ name }));
}

const FIND_SYSTEM = READ_SYSTEM.replace(
  "You read photos of homework for primary-school children (grades 1–4) in Uzbekistan.",
  `You read a school textbook (PDF) for primary-school children (grades 1–4) in Uzbekistan and find one exercise in it.
Pages are named by the number PRINTED on the page, which often differs from the PDF page index. Exercises are numbered within the book or the lesson ("Упражнение 5", "5-mashq", "№ 5", "Exercise 5").
Find the exercise the user asks for and transcribe only it. If it does not exist on that page, set readable to false.`,
);

/** Finds "page 21, exercise 5" in a textbook already in Gemini's file store. */
export async function findInBook(fileUri: string, page: string, number: string, lang: Lang): Promise<{ readable: boolean; tasks: ReadTask[] }> {
  const out = (await ask(
    FIND_SYSTEM,
    {
      file: { uri: fileUri, mimeType: "application/pdf" },
      text: `Find the exercise number ${number} on the page with the printed number ${page}. Transcribe it. Language for titles: ${LANG_NAME[lang]}.`,
    },
    READ_SCHEMA,
    LESSON_JOB,
    "gemini",
  )) as { readable: boolean; tasks: (ReadTask | string)[] };
  return cleanTasks(out);
}
