// Textbook logic against a real Postgres. Runs when TEST_POSTGRES_URL is set
// (a throwaway database); storage and the AI are replaced with fakes.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const url = process.env.TEST_POSTGRES_URL;

const ai = vi.hoisted(() => ({
  uploadBookFile: vi.fn(),
  bookFileState: vi.fn(),
  findInBook: vi.fn(),
}));
vi.mock("@/lib/server/ai", () => ai);
vi.mock("@/lib/server/storage", () => ({
  signedUpload: vi.fn(async (path: string) => ({ url: `https://storage.test/sign/${path}?token=t`, apikey: "anon" })),
  downloadBook: vi.fn(async () => new Blob(["%PDF-1.4"])),
}));

describe.skipIf(!url)("textbooks", () => {
  let books: typeof import("@/lib/server/books");
  let sql: NonNullable<ReturnType<typeof import("@/lib/server/db").db>>;

  beforeAll(async () => {
    process.env.POSTGRES_URL = url;
    const db = await import("@/lib/server/db");
    sql = db.db()!;
    await sql`drop table if exists book_tasks, books, lessons cascade`;
    books = await import("@/lib/server/books");
  });
  afterAll(async () => {
    await sql?.end();
  });

  it("adds a book and lists it for its grade only", async () => {
    const added = await books.createBook({ title: "Русский язык 3", grade: 3, subject: "language", lang: "ru" }, 1000);
    expect(added.url).toBe(`https://storage.test/sign/${added.id}.pdf?token=t`);
    expect((await books.listBooks(3)).map((b) => b.title)).toEqual(["Русский язык 3"]);
    expect(await books.listBooks(2)).toEqual([]);
  });

  it("sends the PDF to the AI once, then waits until it is ready", async () => {
    const [{ id }] = await books.listBooks(3);
    const expires = new Date(Date.now() + 47 * 3600_000);
    ai.uploadBookFile.mockResolvedValueOnce({ name: "files/1", uri: "gs://1", expires, ready: false });
    expect(await books.prepareBook(id)).toEqual({ ready: false });
    ai.bookFileState.mockResolvedValueOnce({ name: "files/1", uri: "gs://1", expires, ready: true });
    expect(await books.prepareBook(id)).toEqual({ ready: true, uri: "gs://1" });
    expect(ai.uploadBookFile).toHaveBeenCalledTimes(1);
  });

  it("finds an exercise with the AI once, then from the database", async () => {
    const [{ id }] = await books.listBooks(3);
    const expires = new Date(Date.now() + 47 * 3600_000);
    ai.bookFileState.mockResolvedValue({ name: "files/1", uri: "gs://1", expires, ready: true });
    ai.findInBook.mockResolvedValueOnce({ readable: true, tasks: [{ title: "Двойные согласные", text: "В су(б, бб)оту", gaps: true }] });
    const first = await books.findExercise(id, "21", "5", "ru");
    expect(first).toMatchObject({ status: "found", readable: true });
    const again = await books.findExercise(id, " 21 ", "5", "ru");
    expect(again).toMatchObject({ status: "found", cached: true, tasks: [{ text: "В су(б, бб)оту", gaps: true }] });
    expect(ai.findInBook).toHaveBeenCalledTimes(1);
  });

  it("does not save an exercise that was not found", async () => {
    const [{ id }] = await books.listBooks(3);
    ai.findInBook.mockResolvedValueOnce({ readable: false, tasks: [] });
    expect(await books.findExercise(id, "99", "1", "ru")).toMatchObject({ readable: false });
    const rows = await sql`select page from book_tasks where book_id = ${id}`;
    expect(rows.map((r) => r.page)).toEqual(["21"]);
  });

  it("reports 'preparing' while the AI is still reading the book", async () => {
    const [{ id }] = await books.listBooks(3);
    ai.bookFileState.mockResolvedValueOnce({ name: "files/1", uri: "gs://1", expires: new Date(Date.now() + 3600_000), ready: false });
    expect(await books.findExercise(id, "22", "1", "ru")).toEqual({ status: "preparing" });
  });
});
