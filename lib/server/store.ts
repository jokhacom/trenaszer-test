// Lessons the AI already built, and a simple request limit.
// Lessons live in the cloud database when one is connected, so a task one
// child already sent costs nothing the next time. A local copy (memory, and
// .data/ when the disk is writable) works without a database too.

import fs from "node:fs";
import path from "node:path";
import type { Lesson } from "../types";
import { db, migrate } from "./db";

const FILE = path.join(process.cwd(), ".data", "lessons.json");
const lessons = new Map<string, Lesson>();
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8")) as Record<string, Lesson>;
    for (const [k, v] of Object.entries(data)) lessons.set(k, v);
  } catch {
    // No saved lessons yet.
  }
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(lessons)));
  } catch {
    // Read-only disk (e.g. serverless): the in-memory copy still works.
  }
}

/**
 * The same textbook task typed or photographed by different children should
 * map to one key: case, spaces, punctuation and the task number are ignored.
 */
export function fingerprint(text: string, lang: string, grade: number): string {
  const norm = text
    .toLowerCase()
    .replace(/^\s*(№|n|no\.?)\s*\d+[.)]?\s*/i, "")
    .replace(/[‘’`ʼʻ']/g, "")
    .replace(/[×x·*]/g, "*")
    .replace(/[:÷]/g, "/")
    .replace(/[−–—]/g, "-")
    .replace(/[^\p{L}\p{N}+\-*/=?]/gu, "");
  return `${lang}|${grade}|${norm}`;
}

export async function getLesson(key: string): Promise<Lesson | undefined> {
  load();
  const local = lessons.get(key);
  if (local) return local;
  const s = db();
  if (!s) return undefined;
  try {
    await migrate(s);
    const rows = await s<{ lesson: Lesson }[]>`
      update lessons set hits = hits + 1 where key = ${key} returning lesson`;
    if (rows[0]) lessons.set(key, rows[0].lesson);
    return rows[0]?.lesson;
  } catch (e) {
    // A database problem must not stop the child: the AI builds the lesson again.
    console.error("lesson cache read failed", e);
    return undefined;
  }
}

export async function putLesson(key: string, lesson: Lesson): Promise<void> {
  load();
  lessons.set(key, lesson);
  persist();
  const s = db();
  if (!s) return;
  try {
    await migrate(s);
    await s`
      insert into lessons (key, lesson) values (${key}, ${s.json(lesson as never)})
      on conflict (key) do nothing`;
  } catch (e) {
    console.error("lesson cache write failed", e);
  }
}

// ---- Request limit per visitor, so a public prototype can't run up the AI bill ----

const hits = new Map<string, number[]>();

export function allow(ip: string, kind: string, perHour: number): boolean {
  const key = `${kind}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= perHour) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
