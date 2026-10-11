import { prepareBook } from "@/lib/server/books";
import { booksEnabled, failure, isId } from "@/lib/server/books-api";

export const runtime = "nodejs";
// Sending a big PDF to the AI's file store can take a while.
export const maxDuration = 120;

/** Gets the uploaded PDF ready for the AI. The app calls it until `ready` is true. */
export async function POST(req: Request) {
  if (!booksEnabled()) return Response.json({ error: "books_off" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (!isId(body?.id)) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    const { ready } = await prepareBook(body.id);
    return Response.json({ ready });
  } catch (e) {
    return failure("prepare", e);
  }
}
