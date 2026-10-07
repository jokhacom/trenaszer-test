import { lessonFromExample } from "@/lib/problems";
import { aiEnabled, AiError, buildLesson } from "@/lib/server/ai";
import { allow, clientIp, fingerprint, getLesson, putLesson } from "@/lib/server/store";
import { LANGS, type Grade, type Lang } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: string; lang?: string; grade?: number } | null;
  const text = body?.text?.trim().slice(0, 1500);
  const lang = LANGS.includes(body?.lang as Lang) ? (body!.lang as Lang) : null;
  const grade = [1, 2, 3, 4].includes(Number(body?.grade)) ? (Number(body!.grade) as Grade) : null;
  if (!text || !lang || !grade) return Response.json({ error: "bad_request" }, { status: 400 });

  // 1. Plain examples ("35 + 27") get a built-in ladder: no AI call at all.
  const local = lessonFromExample(text, lang, grade);
  if (local) return Response.json({ lesson: local });

  // 2. A task some child already sent: reuse the saved ladder.
  const key = fingerprint(text, lang, grade);
  const cached = getLesson(key);
  if (cached) return Response.json({ lesson: cached, cached: true });

  // 3. A new task: ask the AI once and save the result.
  if (!aiEnabled()) return Response.json({ error: "ai_off" }, { status: 503 });
  if (!allow(clientIp(req), "lesson", 30)) return Response.json({ error: "limit" }, { status: 429 });
  try {
    const result = await buildLesson(text, lang, grade);
    if (!result.ok) return Response.json({ error: "unsupported", reason: result.reason }, { status: 422 });
    putLesson(key, result.lesson);
    return Response.json({ lesson: result.lesson });
  } catch (e) {
    console.error("lesson failed", e);
    return Response.json({ error: e instanceof AiError ? e.message : "ai_error" }, { status: 502 });
  }
}
