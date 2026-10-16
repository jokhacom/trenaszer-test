"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { authHeader } from "@/lib/cloud";
import { tr, type Key } from "@/lib/i18n";
import type { Grade, Lang, Subject } from "@/lib/types";

interface Book {
  id: string;
  title: string;
  subject: Subject;
}

/** One exercise found in a book, in the same shape as a task read from a photo. */
export interface FoundTask {
  title: string;
  text: string;
  gaps?: boolean;
}

const SUBJECT_KEYS: Record<Subject, Key> = {
  math: "subjMath",
  language: "subjLanguage",
  reading: "subjReading",
  english: "subjEnglish",
  world: "subjWorld",
};
const BOOK_KEY = "mirodil:book";
const MAX_BYTES = 50 * 1024 * 1024;

function remembered(): string | null {
  try {
    return localStorage.getItem(BOOK_KEY);
  } catch {
    return null;
  }
}

function remember(id: string | null) {
  try {
    if (id) localStorage.setItem(BOOK_KEY, id);
    else localStorage.removeItem(BOOK_KEY);
  } catch {
    // Storage is off: the child picks the book again next time.
  }
}

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({ error: "ai_error", code: `http-${res.status}` }))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "ai_error", code: "network" } };
  }
}

/** Uploads the PDF straight to cloud storage, reporting progress (0–1). */
function upload(url: string, apikey: string, file: File, onProgress: (p: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("apikey", apikey);
    // Old Supabase keys are JWTs and also go in Authorization; new sb_… keys do not.
    if (apikey.startsWith("eyJ")) xhr.setRequestHeader("Authorization", `Bearer ${apikey}`);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Textbooks of the child's grade: pick a book, type "page 21, exercise 5",
 * get the exercise text. A grown-up can add a book as a PDF.
 */
export default function Books({ lang, grade, onFound }: { lang: Lang; grade: Grade; onFound: (tasks: FoundTask[]) => void }) {
  const t = (k: Key) => tr(lang, k);
  const [books, setBooks] = useState<Book[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [book, setBook] = useState<string | null>(null);
  const [page, setPage] = useState("");
  const [number, setNumber] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // What the app is waiting for (uploading, preparing, finding); shown above the form.
  const [busy, onBusy] = useState<string | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  async function load(select?: string) {
    try {
      const res = await fetch(`/api/books?grade=${grade}`, { headers: await authHeader() });
      const data = (await res.json()) as { enabled?: boolean; books?: Book[] };
      setEnabled(Boolean(data.enabled));
      const list = data.books ?? [];
      setBooks(list);
      const keep = select ?? remembered();
      setBook(list.some((b) => b.id === keep) ? keep : list.length === 1 ? list[0].id : null);
    } catch {
      setBooks([]);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  function errorText(data: Record<string, unknown>, status: number) {
    if (status === 429 || data.error === "limit") return t("busy");
    if (data.error === "too_big") return t("bookTooBig");
    return `${t("error")} (${t("errorCode")}: ${String(data.code ?? data.error ?? status)})`;
  }

  /** Asks the server to get the book ready for the AI, until it is. */
  async function waitReady(id: string): Promise<boolean> {
    for (let i = 0; i < 40 && alive.current; i++) {
      const r = await postJson("/api/books/prepare", { id });
      if (!r.ok) {
        setMessage(errorText(r.data, r.status));
        return false;
      }
      if (r.data.ready) return true;
      await sleep(5000);
    }
    return false;
  }

  async function find() {
    if (!book || !page.trim() || !number.trim()) return;
    setMessage(null);
    onBusy(t("bookFinding"));
    for (let i = 0; i < 3; i++) {
      const r = await postJson("/api/books/find", { id: book, page: page.trim(), number: number.trim(), lang });
      if (r.ok && r.data.preparing) {
        // The book is still being sent to the AI (first use, or after 48 hours).
        onBusy(t("bookPreparing"));
        if (!(await waitReady(book))) break;
        onBusy(t("bookFinding"));
        continue;
      }
      onBusy(null);
      if (!r.ok) return setMessage(errorText(r.data, r.status));
      const tasks = (r.data.tasks as FoundTask[] | undefined) ?? [];
      if (!r.data.readable || tasks.length === 0) return setMessage(t("bookNotFound"));
      return onFound(tasks);
    }
    onBusy(null);
  }

  if (!enabled) {
    return (
      <div className="card">
        <p className="muted" style={{ margin: 0 }}>
          📚 {t("bookOff")}
        </p>
      </div>
    );
  }
  if (!books) return null;

  const waiting = busy && (
    <div className="row" role="status" style={{ gap: 12 }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 4 }} />
      <b>{busy}</b>
    </div>
  );

  if (adding) {
    return (
      <AddBook
        waiting={waiting}
        lang={lang}
        grade={grade}
        onBusy={onBusy}
        onCancel={() => setAdding(false)}
        onAdded={async (id) => {
          setAdding(false);
          remember(id);
          await load(id);
          onBusy(t("bookPreparing"));
          await waitReady(id);
          onBusy(null);
        }}
        errorText={errorText}
      />
    );
  }

  const current = books.find((b) => b.id === book);

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>📚 {t("bookTitle")}</h2>
      {waiting}
      {message && <div className="bubble">{message}</div>}

      {current ? (
        <>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>
              {current.title} <span className="muted">· {t(SUBJECT_KEYS[current.subject])}</span>
            </b>
            <button className="link-btn" style={{ margin: 0 }} onClick={() => setBook(null)}>
              {t("bookChange")}
            </button>
          </div>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              find();
            }}
          >
            <label className="stack" style={{ flex: 1, gap: 4, fontWeight: 800 }}>
              {t("bookPage")}
              <input className="answer-input" inputMode="numeric" value={page} onChange={(e) => setPage(e.target.value)} maxLength={8} />
            </label>
            <label className="stack" style={{ flex: 1, gap: 4, fontWeight: 800 }}>
              {t("bookNumber")}
              <input className="answer-input" inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={8} />
            </label>
            <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-end" }} disabled={!!busy || !page.trim() || !number.trim()}>
              {t("bookFind")}
            </button>
          </form>
        </>
      ) : (
        <>
          <span style={{ fontWeight: 800 }}>{books.length ? t("bookPick") : t("bookNone")}</span>
          {books.map((b) => (
            <button
              key={b.id}
              className="btn btn-light btn-wide"
              style={{ justifyContent: "flex-start", textAlign: "left" }}
              onClick={() => {
                setBook(b.id);
                remember(b.id);
              }}
            >
              📗 {b.title} <span className="muted">· {t(SUBJECT_KEYS[b.subject])}</span>
            </button>
          ))}
        </>
      )}

      <button className="link-btn" style={{ margin: 0 }} onClick={() => setAdding(true)}>
        {t("bookAdd")}
      </button>
    </div>
  );
}

function AddBook({
  waiting,
  lang,
  grade,
  onBusy,
  onCancel,
  onAdded,
  errorText,
}: {
  waiting: ReactNode;
  lang: Lang;
  grade: Grade;
  onBusy: (what: string | null) => void;
  onCancel: () => void;
  onAdded: (id: string) => void;
  errorText: (data: Record<string, unknown>, status: number) => string;
}) {
  const t = (k: Key) => tr(lang, k);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<Subject>("math");
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function pick(f: File | undefined) {
    setMessage(null);
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return setMessage(t("bookNotPdf"));
    if (f.size > MAX_BYTES) return setMessage(t("bookTooBig"));
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").slice(0, 120));
  }

  async function send() {
    if (!file || !title.trim()) return;
    setMessage(null);
    setSending(true);
    onBusy(t("bookUploading"));
    const r = await postJson("/api/books", { title: title.trim(), grade, lang, subject, size: file.size });
    if (!r.ok) {
      onBusy(null);
      setSending(false);
      return setMessage(errorText(r.data, r.status));
    }
    const ok = await upload(String(r.data.url), String(r.data.apikey), file, (p) => onBusy(`${t("bookUploading")} ${Math.round(p * 100)}%`));
    onBusy(null);
    setSending(false);
    if (!ok) return setMessage(`${t("error")} (${t("errorCode")}: upload)`);
    onAdded(String(r.data.id));
  }

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>{t("bookAdd")}</h2>
      <p className="muted" style={{ margin: 0 }}>
        {t("bookForParents")}
      </p>
      {waiting}
      {message && <div className="bubble">{message}</div>}
      <input type="file" accept="application/pdf,.pdf" onChange={(e) => pick(e.target.files?.[0])} />
      <label className="stack" style={{ gap: 4, fontWeight: 800 }}>
        {t("bookName")}
        <input className="answer-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </label>
      <label className="stack" style={{ gap: 4, fontWeight: 800 }}>
        {t("bookSubject")}
        <select className="answer-input" value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
          {(Object.keys(SUBJECT_KEYS) as Subject[]).map((s) => (
            <option key={s} value={s}>
              {t(SUBJECT_KEYS[s])}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={send} disabled={sending || !file || !title.trim()}>
          {t("bookUpload")}
        </button>
        <button className="btn btn-light" style={{ flex: 1 }} onClick={onCancel}>
          {t("back")}
        </button>
      </div>
    </div>
  );
}
