// Shared checks for the textbook routes.

import { booksAiEnabled } from "./ai";
import { db } from "./db";
import { storageEnabled } from "./storage";
import { LANGS, type Grade, type Lang, type Subject } from "../types";

/** Textbooks need the cloud database, file storage and Gemini. */
export const booksEnabled = () => Boolean(db()) && storageEnabled() && booksAiEnabled();

export const SUBJECTS: Subject[] = ["math", "language", "reading", "english", "world"];

export const toGrade = (v: unknown): Grade | null => ([1, 2, 3, 4].includes(Number(v)) ? (Number(v) as Grade) : null);
export const toLang = (v: unknown): Lang | null => (LANGS.includes(v as Lang) ? (v as Lang) : null);
export const toSubject = (v: unknown): Subject | null => (SUBJECTS.includes(v as Subject) ? (v as Subject) : null);
export const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

/** A page or exercise number as a child types it: "21", "5", "5a". */
export const toNumber = (v: unknown): string | null =>
  typeof v === "string" && /^[\p{L}\p{N}.\-]{1,8}$/u.test(v.trim()) ? v.trim() : null;

export function failure(where: string, e: unknown) {
  console.error(`books: ${where} failed`, e);
  const code = e && typeof e === "object" && "code" in e && typeof e.code === "string" ? e.code : "books";
  return Response.json({ error: "ai_error", code }, { status: 502 });
}
