import { requireLogin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { createBook, listBooks } from "@/lib/server/books";
import { booksEnabled, failure, toGrade, toLang, toSubject } from "@/lib/server/books-api";
import { MAX_BOOK_BYTES } from "@/lib/server/storage";
import { allow, clientIp } from "@/lib/server/store";

export const runtime = "nodejs";

/** Textbooks for a grade. */
export async function GET(req: Request) {
  const denied = await requireLogin(req, Boolean(db()));
  if (denied) return denied;
  if (!booksEnabled()) return Response.json({ enabled: false, books: [] });
  const grade = toGrade(new URL(req.url).searchParams.get("grade"));
  if (!grade) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json({ enabled: true, books: await listBooks(grade) });
  } catch (e) {
    return failure("list", e);
  }
}

/** Adds a textbook: saves its details and returns a one-time upload URL for the PDF. */
export async function POST(req: Request) {
  const denied = await requireLogin(req, Boolean(db()));
  if (denied) return denied;
  if (!booksEnabled()) return Response.json({ error: "books_off" }, { status: 503 });
  if (!allow(clientIp(req), "book-add", 10)) return Response.json({ error: "limit" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const grade = toGrade(body?.grade);
  const lang = toLang(body?.lang);
  const subject = toSubject(body?.subject);
  const size = Number(body?.size);
  if (!title || !grade || !lang || !subject) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BOOK_BYTES) return Response.json({ error: "too_big" }, { status: 413 });
  try {
    return Response.json(await createBook({ title, grade, lang, subject }, size));
  } catch (e) {
    return failure("create", e);
  }
}
