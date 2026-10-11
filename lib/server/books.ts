// Textbooks in the cloud: the list for a grade, adding a PDF, and finding
// "page 21, exercise 5" in it. A found exercise is saved, so the next child
// with the same book gets it without an AI call.

import { bookFileState, findInBook, uploadBookFile, type AiFile, type ReadTask } from "./ai";
import { db, migrate } from "./db";
import { downloadBook, signedUpload } from "./storage";
import type { Grade, Lang, Subject } from "../types";

export interface Book {
  id: string;
  title: string;
  grade: Grade;
  subject: Subject;
  lang: Lang;
}

interface BookRow extends Book {
  path: string;
  ai_file: string | null;
  ai_uri: string | null;
  ai_expires: Date | null;
}

async function sql() {
  const s = db();
  if (!s) throw new Error("no database");
  await migrate(s);
  return s;
}

export async function listBooks(grade: Grade): Promise<Book[]> {
  const s = await sql();
  return await s<Book[]>`
    select id, title, grade, subject, lang from books
    where grade = ${grade} order by created_at desc limit 50`;
}

/** Saves the book's details and returns where the browser uploads the PDF. */
export async function createBook(b: Omit<Book, "id">, sizeBytes: number) {
  const s = await sql();
  const [row] = await s<{ id: string }[]>`
    insert into books (title, grade, subject, lang, path, size_bytes)
    values (${b.title}, ${b.grade}, ${b.subject}, ${b.lang}, '', ${sizeBytes})
    returning id`;
  const path = `${row.id}.pdf`;
  await s`update books set path = ${path} where id = ${row.id}`;
  return { id: row.id, ...(await signedUpload(path)) };
}

async function getBook(id: string): Promise<BookRow | undefined> {
  const s = await sql();
  const [row] = await s<BookRow[]>`select * from books where id = ${id}`;
  return row;
}

/**
 * Makes sure the AI has the book: sends the PDF to Gemini's file store if it
 * is not there (Gemini keeps files for 48 hours). Gemini needs a little time
 * to process a big PDF; until then `ready` is false and the app asks again.
 */
export async function prepareBook(id: string): Promise<{ ready: boolean; uri?: string }> {
  const book = await getBook(id);
  if (!book) throw new Error("no such book");
  const s = await sql();
  let file: AiFile | null = null;
  const fresh = book.ai_file && book.ai_uri && book.ai_expires && book.ai_expires.getTime() > Date.now() + 10 * 60_000;
  if (fresh) {
    file = await bookFileState(book.ai_file!);
  } else {
    file = await uploadBookFile(await downloadBook(book.path), book.title);
    await s`
      update books set ai_file = ${file.name}, ai_uri = ${file.uri}, ai_expires = ${file.expires}
      where id = ${id}`;
  }
  return file.ready ? { ready: true, uri: file.uri } : { ready: false };
}

const clean = (v: string) => v.trim().toLowerCase().replace(/\s+/g, "").slice(0, 12);

export type FindResult = { status: "found"; readable: boolean; tasks: ReadTask[]; cached?: boolean } | { status: "preparing" };

export async function findExercise(id: string, page: string, number: string, lang: Lang): Promise<FindResult> {
  const s = await sql();
  const p = clean(page);
  const n = clean(number);
  const [saved] = await s<{ tasks: ReadTask[] }[]>`
    select tasks from book_tasks where book_id = ${id} and page = ${p} and number = ${n}`;
  if (saved) return { status: "found", readable: true, tasks: saved.tasks, cached: true };

  const book = await prepareBook(id);
  if (!book.ready || !book.uri) return { status: "preparing" };
  const out = await findInBook(book.uri, p, n, lang);
  if (out.readable && out.tasks.length > 0) {
    await s`
      insert into book_tasks (book_id, page, number, tasks)
      values (${id}, ${p}, ${n}, ${s.json(out.tasks as never)})
      on conflict do nothing`;
  }
  return { status: "found", ...out };
}
