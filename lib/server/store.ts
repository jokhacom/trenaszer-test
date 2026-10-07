// Prototype storage: lessons the AI already built, and a simple request limit.
// In memory, mirrored to .data/ when the disk is writable. The full version
// keeps lessons in the database so every child gets them for free.

import fs from "node:fs";
import path from "node:path";
import type { Lesson } from "../types";

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

export function getLesson(key: string): Lesson | undefined {
  load();
  return lessons.get(key);
}

export function putLesson(key: string, lesson: Lesson) {
  load();
  lessons.set(key, lesson);
  persist();
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
