import { requireLogin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { findExercise } from "@/lib/server/books";
import { booksEnabled, failure, isId, toLang, toNumber } from "@/lib/server/books-api";
import { allow, clientIp } from "@/lib/server/store";

export const runtime = "nodejs";
// Above the AI time limits in lib/server/ai.ts, so a slow answer ends with a clear error code.
export const maxDuration = 120;

/** "Page 21, exercise 5" → the exercise text, in the same shape as a read photo. */
export async function POST(req: Request) {
  const denied = await requireLogin(req, Boolean(db()));
  if (denied) return denied;
  if (!booksEnabled()) return Response.json({ error: "books_off" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const page = toNumber(body?.page);
  const number = toNumber(body?.number);
  const lang = toLang(body?.lang) ?? "ru";
  if (!isId(body?.id) || !page || !number) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!allow(clientIp(req), "book-find", 40)) return Response.json({ error: "limit" }, { status: 429 });
  try {
    const out = await findExercise(body.id, page, number, lang);
    if (out.status === "preparing") return Response.json({ preparing: true });
    return Response.json({ readable: out.readable, tasks: out.tasks, cached: out.cached ?? false });
  } catch (e) {
    return failure("find", e);
  }
}
