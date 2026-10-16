import { lessonFromExample } from "@/lib/problems";
import { aiEnabled, AiError, buildDrill, buildLesson, type Input } from "@/lib/server/ai";
import { allow, clientIp, fingerprint, getLesson, putLesson } from "@/lib/server/store";
import { LANGS, type Grade, type Lang } from "@/lib/types";

export const runtime = "nodejs";

// Raise when the way lessons are built changes (prompt, pictures): saved
// lessons of the old kind are then built again instead of reused.
const LESSON_VERSION = "v3";
// Above the AI time limits in lib/server/ai.ts, so a slow answer ends with a clear error code.
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: string; lang?: string; grade?: number; image?: string; mode?: string } | null;
  // "drill": an exercise with many gaps of one kind → one rule + a mini-game.
  const drill = body?.mode === "drill";
  const text = body?.text?.trim().slice(0, drill ? 4000 : 1500);
  const lang = LANGS.includes(body?.lang as Lang) ? (body!.lang as Lang) : null;
  const grade = [1, 2, 3, 4].includes(Number(body?.grade)) ? (Number(body!.grade) as Grade) : null;
  if (!text || !lang || !grade) return Response.json({ error: "bad_request" }, { status: 400 });

  // 1. Plain examples ("35 + 27") get a built-in ladder: no AI call at all.
  const local = drill ? null : lessonFromExample(text, lang, grade);
  if (local) return Response.json({ lesson: local });

  // 2. A task some child already sent: reuse the saved ladder.
  const key = `${LESSON_VERSION}|${drill ? "drill|" : ""}${fingerprint(text, lang, grade)}`;
  const cached = await getLesson(key);
  if (cached) return Response.json({ [drill ? "drill" : "lesson"]: cached, cached: true });

  // 3. A new task: ask the AI once and save the result.
  if (!aiEnabled()) return Response.json({ error: "ai_off" }, { status: 503 });
  if (!allow(clientIp(req), "lesson", 30)) return Response.json({ error: "limit" }, { status: 429 });
  try {
    // A photo of the page helps with tasks whose numbers are in a picture or diagram.
    const m = body?.image?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    const image = m && m[2].length <= 7_000_000 ? { data: m[2], mediaType: m[1] as NonNullable<Input["image"]>["mediaType"] } : undefined;
    if (drill) {
      const result = await buildDrill(text, lang, grade, image);
      if (!result.ok) return Response.json({ error: "unsupported", reason: result.reason }, { status: 422 });
      await putLesson(key, result.drill);
      return Response.json({ drill: result.drill });
    }
    const result = await buildLesson(text, lang, grade, image);
    if (!result.ok) return Response.json({ error: "unsupported", reason: result.reason }, { status: 422 });
    await putLesson(key, result.lesson);
    return Response.json({ lesson: result.lesson });
  } catch (e) {
    console.error("lesson failed", e);
    const error = e instanceof AiError ? e.message : "ai_error";
    const code = e instanceof AiError ? e.code : "unknown";
    return Response.json({ error, code }, { status: error === "limit" ? 429 : 502 });
  }
}
