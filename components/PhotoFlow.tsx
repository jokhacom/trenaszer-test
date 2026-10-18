"use client";

import { useEffect, useRef, useState } from "react";
import { tr, type Key } from "@/lib/i18n";
import { shrinkPhoto } from "@/lib/image";
import { authHeader, loginAgain } from "@/lib/cloud";
import { gapCount } from "@/lib/drill";
import { addToHistory, loadHistory, markSolved, type HistoryEntry } from "@/lib/history";
import { recordPhotoTask, recordResult } from "@/lib/progress";
import type { Drill as DrillData, Grade, Lang, Lesson, Topic } from "@/lib/types";
import Books from "./Books";
import Drill from "./Drill";
import Ladder, { type Game } from "./Ladder";
import Mirodil from "./Mirodil";

type Stage =
  | { s: "start" }
  | { s: "busy"; what: "reading" | "thinking" }
  | { s: "pick" }
  | { s: "confirm"; text: string; gaps?: boolean }
  | { s: "lesson"; lesson: Lesson }
  | { s: "drill"; drill: DrillData };

/** Many gaps of one kind (from the photo reader, or seen in the text) → one rule + a mini-game. */
const isDrill = (text: string, gaps?: boolean) => Boolean(gaps) || gapCount(text) >= 2;

type PostResult = { ok: boolean; status: number; data: Record<string, unknown> };

/** Busy messages change while the child waits, so a long wait doesn't look frozen. */
const WAIT_STEPS: Record<"reading" | "thinking", [number, Key][]> = {
  reading: [[0, "reading"], [4_000, "reading2"], [15_000, "almost"]],
  thinking: [[0, "thinking"], [4_000, "thinking2"], [10_000, "thinking3"], [22_000, "almost"]],
};

function Waiting({ lang, what }: { lang: Lang; what: "reading" | "thinking" }) {
  const [shown, setShown] = useState<Key>(what);
  useEffect(() => {
    const timers = WAIT_STEPS[what].map(([ms, key]) => setTimeout(() => setShown(key), ms));
    return () => timers.forEach(clearTimeout);
  }, [what]);
  return <>{tr(lang, shown)}</>;
}

/** One question read from the photo: a short button title and the full text. */
interface PhotoTask {
  title: string;
  text: string;
  /** Many gaps of one kind: one rule + a mini-game. */
  gaps?: boolean;
}

/** Photo (or typed) task → "Is this your problem?" → help ladder. */
export default function PhotoFlow({
  lang,
  grade,
  ai,
  onHome,
  onGame,
}: {
  lang: Lang;
  grade: Grade;
  ai: boolean;
  onHome: () => void;
  onGame?: (g: Game) => void;
}) {
  const t = (k: Key) => tr(lang, k);
  const [stage, setStage] = useState<Stage>({ s: "start" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  // A photo can hold several questions; the child solves them one by one.
  const [tasks, setTasks] = useState<PhotoTask[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  // The "My tasks" entry of the lesson on screen, marked solved when the child solves it.
  const historyId = useRef<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => setHistory(loadHistory()), [stage.s]);
  const [done, setDone] = useState<number[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  // The lesson for the first question starts building while the child is
  // still checking the text, so "Yes" usually opens it at once.
  const prefetch = useRef<{ text: string; result: Promise<PostResult> } | null>(null);

  /** POST with a time limit. Returns the JSON reply, or an error code to show the user. */
  async function post(url: string, body: unknown): Promise<PostResult> {
    const ctrl = new AbortController();
    // A bit longer than the server's own AI time limits.
    const timer = setTimeout(() => ctrl.abort(), 125_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      // A timeout on the hosting side returns an HTML page, not JSON.
      const data = (await res.json().catch(() => ({ error: "ai_error", code: `http-${res.status}` }))) as Record<string, unknown>;
      if (res.status === 401 && data.error === "logged_out") loginAgain();
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: { error: "ai_error", code: e instanceof DOMException && e.name === "AbortError" ? "timeout" : "network" } };
    } finally {
      clearTimeout(timer);
    }
  }

  function showError(r: { status: number; data: Record<string, unknown> }) {
    const e = r.data.error;
    if (e === "ai_off") return setMessage(t("aiOffWord"));
    // The short code (why the AI declined) helps us find what to improve.
    if (e === "unsupported") return setMessage(`${t("notSupported")} (${t("errorCode")}: ${String(r.data.reason ?? "unsupported").slice(0, 40)})`);
    if (r.status === 429 || e === "limit") return setMessage(t("busy"));
    setMessage(`${t("error")} (${t("errorCode")}: ${String(r.data.code ?? r.status)})`);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    let dataUrl: string;
    try {
      dataUrl = await shrinkPhoto(file);
    } catch {
      setMessage(`${t("error")} (${t("errorCode")}: photo)`);
      return;
    }
    setPhoto(dataUrl);
    prefetch.current = null;
    if (!ai) {
      setMessage(t("aiOff"));
      setStage({ s: "start" });
      return;
    }
    setStage({ s: "busy", what: "reading" });
    const r = await post("/api/read-task", { image: dataUrl, lang });
    const found = ((r.data.tasks as (PhotoTask | string)[] | undefined) ?? []).map((x) =>
      typeof x === "string" ? { title: "", text: x } : x,
    );
    setTasks(found);
    setDone([]);
    setCurrent(null);
    if (!r.ok) {
      showError(r);
      setStage({ s: "start" });
    } else if (!r.data.readable || found.length === 0) {
      setMessage(`${t("notSupported")} (${t("errorCode")}: unreadable)`);
      setStage({ s: "start" });
    } else {
      showTasks(found, dataUrl);
    }
  }

  /** Tasks from a photo or a textbook: confirm one, or pick among several. */
  function showTasks(found: PhotoTask[], image: string | null) {
    setTasks(found);
    setDone([]);
    setCurrent(null);
    setMessage(null);
    const first = found[0].text;
    const mode = isDrill(first, found[0].gaps) ? "drill" : undefined;
    // The lesson for the first question starts building while the child checks the text.
    prefetch.current = { text: first, result: post("/api/lesson", { text: first, lang, grade, image: image ?? undefined, mode }) };
    setStage(found.length === 1 ? { s: "confirm", text: first, gaps: found[0].gaps } : { s: "pick" });
  }

  async function buildLesson(text: string, withPhoto: boolean, gaps?: boolean) {
    const mode = isDrill(text, gaps) ? "drill" : undefined;
    setMessage(null);
    setStage({ s: "busy", what: "thinking" });
    const early = withPhoto && prefetch.current?.text === text ? prefetch.current : null;
    // The photo goes along so the AI can read numbers from pictures and diagrams.
    const fresh = () => post("/api/lesson", { text, lang, grade, image: withPhoto ? (photo ?? undefined) : undefined, mode });
    let r = await (early?.result ?? fresh());
    if (!r.ok && early) {
      // The early request failed (often a busy AI): ask once more before showing an error.
      prefetch.current = null;
      if (r.data.error !== "unsupported") r = await fresh();
    }
    if (r.ok) {
      // Saved in "My tasks": opening it again later costs no AI call.
      const title = (current !== null && tasks[current]?.title) || text.replace(/\s+/g, " ").slice(0, 70);
      // A step-by-step lesson may come instead of a mini-game: "My tasks" reopens what came.
      const came = r.data.drill ? mode : undefined;
      historyId.current = addToHistory({ title, text: text.slice(0, 2000), lang, grade, mode: came, key: r.data.key as string | undefined });
      if (r.data.drill) return setStage({ s: "drill", drill: r.data.drill as DrillData });
      return setStage({ s: "lesson", lesson: r.data.lesson as Lesson });
    }
    showError(r);
    // If the photo had several questions, let the child pick another one.
    setStage(withPhoto && tasks.length > 1 ? { s: "pick" } : { s: "start" });
  }

  /** Opens a task from "My tasks": the saved lesson comes from the cloud, without the AI. */
  async function reopen(e: HistoryEntry) {
    setMessage(null);
    setTasks([]);
    setCurrent(null);
    setPhoto(null);
    setStage({ s: "busy", what: "thinking" });
    const r = await post("/api/lesson", { text: e.text, lang: e.lang, grade: e.grade, mode: e.mode, key: e.key });
    if (r.ok) {
      historyId.current = addToHistory({ title: e.title, text: e.text, lang: e.lang, grade: e.grade, mode: e.mode, key: (r.data.key as string | undefined) ?? e.key });
      if (r.data.drill) return setStage({ s: "drill", drill: r.data.drill as DrillData });
      return setStage({ s: "lesson", lesson: r.data.lesson as Lesson });
    }
    showError(r);
    setStage({ s: "start" });
  }

  // More questions from the same photo: back to the list; otherwise start over.
  function afterTask() {
    if (tasks.length > 1) return setStage({ s: "pick" });
    setPhoto(null);
    setTyped("");
    setStage({ s: "start" });
  }

  if (stage.s === "drill") {
    return (
      <Drill
        drill={stage.drill}
        grade={grade}
        onDone={(r) => {
          recordPhotoTask(r.solved, r.maxLevel);
          if (r.solved && current !== null) setDone((d) => [...d, current]);
          if (r.solved && historyId.current) markSolved(historyId.current);
        }}
        onNext={afterTask}
        nextLabel={tasks.length > 1 ? t("nextQuestion") : undefined}
      />
    );
  }

  if (stage.s === "lesson") {
    return (
      <Ladder
        lesson={stage.lesson}
        grade={grade}
        onGame={onGame}
        onDone={(r) => {
          if (stage.lesson.topic !== "other") recordResult(stage.lesson.topic as Topic, r.solved, r.maxLevel);
          else recordPhotoTask(r.solved, r.maxLevel);
          if (r.solved && current !== null) setDone((d) => [...d, current]);
          if (r.solved && historyId.current) markSolved(historyId.current);
        }}
        onNext={afterTask}
        nextLabel={tasks.length > 1 ? t("nextQuestion") : undefined}
      />
    );
  }

  return (
    <div className="stack">
      <div className="mirodil-row">
        <Mirodil size={72} mood={stage.s === "busy" ? "think" : "happy"} />
        <div className="bubble">
          {stage.s === "busy"
            ? <Waiting key={stage.what} lang={lang} what={stage.what} />
            : stage.s === "pick"
              ? message ?? t(done.length > 0 ? "pickNext" : "pickMany")
              : stage.s === "confirm"
                ? t("isThisIt")
                : message ?? t("photoDesc")}
        </div>
      </div>

      {photo && <img className="photo-preview" src={photo} alt="" />}

      {stage.s === "busy" && (
        <div className="row" style={{ justifyContent: "center" }}>
          <div className="spinner" role="status" aria-label={t(stage.what)} />
        </div>
      )}

      {stage.s === "pick" && (
        // Many short items (one per gap in a spelling exercise) fit better in a grid.
        <div
          className={tasks.length > 6 ? "pick-grid" : "stack"}
          style={tasks.length > 6 ? { gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" } : undefined}
        >
          {tasks.map((task, i) => {
            const solved = done.includes(i);
            return (
              <button
                key={i}
                className={`btn ${solved ? "btn-light" : "btn-blue"} btn-wide`}
                style={{ justifyContent: "space-between", textAlign: "left", minHeight: tasks.length > 6 ? 56 : 68 }}
                onClick={() => {
                  setCurrent(i);
                  buildLesson(task.text, true, task.gaps);
                }}
              >
                <span>
                  {solved ? "✓ " : ""}
                  {task.title || (task.text.length > 60 ? `${task.text.slice(0, 60)}…` : task.text)}
                </span>
                <span aria-hidden>→</span>
              </button>
            );
          })}
        </div>
      )}

      {stage.s === "confirm" && (
        <div className="stack">
          <textarea
            className="answer-input"
            value={stage.text}
            onChange={(e) => setStage({ s: "confirm", text: e.target.value, gaps: stage.gaps })}
            aria-label={t("isThisIt")}
          />
          <div className="row">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => buildLesson(stage.text, true, stage.gaps)} disabled={!stage.text.trim()}>
              ✅ {t("yes")}
            </button>
            <button className="btn btn-light" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
              📷 {t("retake")}
            </button>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 16 }}>
            ✏️ {t("fix")}
          </p>
        </div>
      )}

      <input
        ref={fileRef}
        className="file-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {stage.s === "start" && (
        <div className="stack">
          <button className="btn btn-pink btn-wide" style={{ minHeight: 84, fontSize: 24 }} onClick={() => fileRef.current?.click()}>
            📷 {t("takePhoto")}
          </button>
          <div className="card stack">
            <label htmlFor="typed" style={{ fontWeight: 800 }}>
              ✏️ {t("orType")}
            </label>
            <form
              className="answer-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) {
                  setTasks([]);
                  buildLesson(typed, false);
                }
              }}
            >
              <input
                id="typed"
                className="answer-input"
                style={{ fontSize: 22 }}
                placeholder={t("typePlaceholder")}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
              <button className="btn btn-primary" type="submit" disabled={!typed.trim()}>
                {t("send")}
              </button>
            </form>
          </div>
          {history.length > 0 && <MyTasks lang={lang} list={history} onOpen={reopen} />}
          {ai && (
            <Books
              lang={lang}
              grade={grade}
              onFound={(found) => {
                setPhoto(null);
                showTasks(found, null);
              }}
            />
          )}
        </div>
      )}

      <button className="btn btn-light" onClick={onHome}>
        ← {t("home")}
      </button>
    </div>
  );
}

/** "My tasks": the last tasks, newest first; a tap opens the saved lesson. */
function MyTasks({ lang, list, onOpen }: { lang: Lang; list: HistoryEntry[]; onOpen: (e: HistoryEntry) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, 5);
  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>🕘 {tr(lang, "myTasks")}</h2>
      <p className="muted" style={{ margin: 0, fontSize: 15 }}>
        {tr(lang, "myTasksNote")}
      </p>
      {shown.map((e) => (
        <button
          key={e.id}
          className="btn btn-light btn-wide"
          style={{ justifyContent: "space-between", textAlign: "left", minHeight: 56 }}
          onClick={() => onOpen(e)}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {e.solved ? "✅ " : "📝 "}
            {e.title}
          </span>
          <span aria-hidden>→</span>
        </button>
      ))}
      {list.length > 5 && !all && (
        <button className="link-btn" style={{ margin: 0 }} onClick={() => setAll(true)}>
          {tr(lang, "myTasksAll")} ({list.length})
        </button>
      )}
    </section>
  );
}
