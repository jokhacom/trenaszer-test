// Claude API calls. Server-only: the API key never reaches the browser.
//
// Cost rules (README → "Экономия на AI"):
// 1. Each new task is sent to the AI once; its ladder is cached and reused.
// 2. The long system prompts are identical on every request and cached.
// 3. The model is set per job, so cheaper models can take simple jobs later.

import Anthropic from "@anthropic-ai/sdk";
import { evaluate } from "../expression";
import { containsNumber } from "../problems";
import type { Grade, Lang, Lesson, Step } from "../types";

export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function api(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const LANG_NAME: Record<Lang, string> = { uz: "Uzbek (Latin script)", ru: "Russian", en: "English" };

const STYLE = `Writing rules for every text a child will read:
- The reader is a child aged 7–10. One sentence = one thought. Short, familiar words. A new term is explained at once with an example.
- Friendly, calm tone. Never scold, never say the child is slow.
- Uzbek: Latin alphabet as in school textbooks, spelling per the imlo.uz dictionary, o‘ and g‘ written with ‘ (U+2018), tutuq belgisi ʼ (U+02BC).
- Russian: style of "Пиши, сокращай" and "Ясно, понятно" (Ильяхов): no bureaucratic words, no filler, the main thing first, simple to complex. Prefer present tense so the text fits both boys and girls.
- English: plain English (Oxford Guide to Plain English), vocabulary at CEFR A1–A2.`;

const READ_SYSTEM = `You read photos of homework for primary-school children (grades 1–4) in Uzbekistan.
Transcribe every school task you can see in the photo exactly as written, keeping its original language and numbers. Printed or handwritten text may be in Uzbek, Russian or English.
- One array item per task. Keep the task number if there is one ("№5. ...").
- Do not solve anything and do not add hints.
- If the photo is not a school task, or it is unreadable, set readable to false and return an empty list.
${STYLE}`;

const LESSON_SYSTEM = `You are Zukko, a patient tutor for primary-school children (grades 1–4) in Uzbekistan.
The product's main rule: the AI never does the homework for the child. It never gives the answer to the child's own task — not in a hint, not in a question, not in an example. The child must find the answer.

You receive one task. Build a help ladder for it. The app shows the steps one by one, only when the child asks for help:
1. hint — a direction: where to look, what to start with. Do not contain the answer.
2. question — one leading question the child answers with a number. "expect" is the number the child should give. The prompt must not contain the final answer, and "expect" must not be the final answer.
3. example — a similar but SIMPLER task, with DIFFERENT numbers, solved in full, line by line (3–6 short lines). The first line names it as a similar example. Its numbers and its result must differ from the child's task and from its answer.
4. together — 2–6 small steps through the child's own task. Each step is a question with a numeric "expect". The child does every calculation. The last step's expect is the final answer, but its prompt must not state it.

Teaching approach (Singapore primary mathematics): concrete → pictorial → abstract. Start from objects or a picture, then numbers. For word problems think in parts and wholes (bar model). Use problem-solving strategies: draw a model, act it out, look for a pattern, work backwards, solve a simpler problem.

Also return:
- task: the task text, cleaned up, in the output language.
- topic: a short topic name in the output language.
- answer: the final numeric answer.
- solution_expression: one arithmetic expression with only digits, + - * / ( ) that evaluates to the answer, e.g. "(15 - 6) * 2". The app uses it to check your answer.

Set supported to false (and fill the other fields with empty values) when:
- it is not a school task for grades 1–4, or it is unsafe or unrelated to studies;
- the final answer is not a single number (comparison signs, words, drawings, several answers);
- the task text is unclear.
In "reason" explain briefly in the output language.

Write every text in the output language given by the user, even if the task is in another language.
${STYLE}`;

const READ_SCHEMA = {
  type: "object",
  properties: {
    readable: { type: "boolean" },
    tasks: { type: "array", items: { type: "string" } },
  },
  required: ["readable", "tasks"],
  additionalProperties: false,
};

const STEP_SCHEMA = {
  type: "object",
  properties: { prompt: { type: "string" }, expect: { type: "number" } },
  required: ["prompt", "expect"],
  additionalProperties: false,
};

const LESSON_SCHEMA = {
  type: "object",
  properties: {
    supported: { type: "boolean" },
    reason: { type: "string" },
    task: { type: "string" },
    topic: { type: "string" },
    answer: { type: "number" },
    solution_expression: { type: "string" },
    hint: { type: "string" },
    question: STEP_SCHEMA,
    example: { type: "array", items: { type: "string" } },
    together: { type: "array", items: STEP_SCHEMA },
  },
  required: ["supported", "reason", "task", "topic", "answer", "solution_expression", "hint", "question", "example", "together"],
  additionalProperties: false,
};

async function ask(
  system: string,
  content: Anthropic.Beta.BetaContentBlockParam[],
  schema: Record<string, unknown>,
): Promise<unknown> {
  const response = await api().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // Identical on every request, so it is read from the prompt cache.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    // Server-side fallback if the model declines a request.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") throw new AiError("refused");
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
  if (!text) throw new AiError("empty");
  return JSON.parse(text.text);
}

export class AiError extends Error {}

export async function readTask(imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<{ readable: boolean; tasks: string[] }> {
  const out = (await ask(
    READ_SYSTEM,
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
      { type: "text", text: "Transcribe the tasks in this photo." },
    ],
    READ_SCHEMA,
  )) as { readable: boolean; tasks: string[] };
  return { readable: out.readable, tasks: (out.tasks ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 10) };
}

interface RawLesson {
  supported: boolean;
  reason: string;
  task: string;
  topic: string;
  answer: number;
  solution_expression: string;
  hint: string;
  question: Step;
  example: string[];
  together: Step[];
}

const GENERIC_HINT: Record<Lang, string> = {
  uz: "Masalani yana bir bor o‘qi: nima maʼlum va nimani topish kerak?",
  ru: "Прочитай задачу ещё раз: что известно и что нужно найти?",
  en: "Read the problem again: what do we know, and what do we need to find?",
};

export type LessonResult = { ok: true; lesson: Lesson } | { ok: false; reason: string };

export async function buildLesson(task: string, lang: Lang, grade: Grade): Promise<LessonResult> {
  const raw = (await ask(
    LESSON_SYSTEM,
    [{ type: "text", text: `Output language: ${LANG_NAME[lang]}\nGrade: ${grade}\nTask:\n${task}` }],
    LESSON_SCHEMA,
  )) as RawLesson;
  return checkLesson(raw, lang);
}

/**
 * The app does not take the AI's word for it: the answer is recomputed from the
 * expression, and any text that would reveal the answer is removed.
 */
export function checkLesson(raw: RawLesson, lang: Lang): LessonResult {
  if (!raw.supported) return { ok: false, reason: raw.reason };
  const computed = evaluate(raw.solution_expression);
  if (computed === null || Math.abs(computed - raw.answer) > 1e-9 || !Number.isFinite(raw.answer)) {
    return { ok: false, reason: "answer-check-failed" };
  }
  const answer = raw.answer;
  const leaks = (s: string) => containsNumber(s, answer);

  const together = raw.together.filter((s) => s.prompt.trim() && !leaks(s.prompt));
  if (together.length === 0) return { ok: false, reason: "no-steps" };

  let question = raw.question;
  if (leaks(question.prompt) || question.expect === answer) {
    question = together.find((s) => s.expect !== answer) ?? together[0];
  }
  const example = raw.example.filter((line) => line.trim() && !leaks(line));

  return {
    ok: true,
    lesson: {
      id: `ai:${raw.task}`,
      topic: "other",
      lang,
      task: raw.task,
      answer,
      hint: leaks(raw.hint) ? GENERIC_HINT[lang] : raw.hint,
      question,
      example: example.length >= 2 ? example : [],
      together,
      source: "ai",
    },
  };
}
