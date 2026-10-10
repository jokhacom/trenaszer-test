"use client";

import { useRef, useState } from "react";
import { tr, type Key } from "@/lib/i18n";
import { shrinkPhoto } from "@/lib/image";
import { recordResult } from "@/lib/progress";
import type { Grade, Lang, Lesson, Topic } from "@/lib/types";
import Ladder from "./Ladder";
import Mirodil from "./Mirodil";

type Stage =
  | { s: "start" }
  | { s: "busy"; what: Key }
  | { s: "pick"; tasks: string[] }
  | { s: "confirm"; text: string }
  | { s: "lesson"; lesson: Lesson };

/** Photo (or typed) task → "Is this your problem?" → help ladder. */
export default function PhotoFlow({ lang, grade, ai, onHome }: { lang: Lang; grade: Grade; ai: boolean; onHome: () => void }) {
  const t = (k: Key) => tr(lang, k);
  const [stage, setStage] = useState<Stage>({ s: "start" });
  const [photo, setPhoto] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** POST with a time limit. Returns the JSON reply, or an error code to show the user. */
  async function post(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      // A timeout on the hosting side returns an HTML page, not JSON.
      const data = (await res.json().catch(() => ({ error: "ai_error", code: `http-${res.status}` }))) as Record<string, unknown>;
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
    if (e === "unsupported") return setMessage(t("notSupported"));
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
    if (!ai) {
      setMessage(t("aiOff"));
      setStage({ s: "start" });
      return;
    }
    setStage({ s: "busy", what: "reading" });
    const r = await post("/api/read-task", { image: dataUrl });
    const tasks = (r.data.tasks as string[] | undefined) ?? [];
    if (!r.ok) {
      showError(r);
      setStage({ s: "start" });
    } else if (!r.data.readable || tasks.length === 0) {
      setMessage(t("notSupported"));
      setStage({ s: "start" });
    } else if (tasks.length === 1) {
      setStage({ s: "confirm", text: tasks[0] });
    } else {
      setStage({ s: "pick", tasks });
    }
  }

  async function buildLesson(text: string, withPhoto: boolean) {
    setMessage(null);
    setStage({ s: "busy", what: "thinking" });
    // The photo goes along so the AI can read numbers from pictures and diagrams.
    const r = await post("/api/lesson", { text, lang, grade, image: withPhoto ? (photo ?? undefined) : undefined });
    if (r.ok) return setStage({ s: "lesson", lesson: r.data.lesson as Lesson });
    showError(r);
    setStage({ s: "start" });
  }

  if (stage.s === "lesson") {
    return (
      <Ladder
        lesson={stage.lesson}
        grade={grade}
        onDone={(r) => {
          if (stage.lesson.topic !== "other") recordResult(stage.lesson.topic as Topic, r.solved, r.maxLevel);
        }}
        onNext={() => {
          setPhoto(null);
          setTyped("");
          setStage({ s: "start" });
        }}
      />
    );
  }

  return (
    <div className="stack">
      <div className="mirodil-row">
        <Mirodil size={72} mood={stage.s === "busy" ? "think" : "happy"} />
        <div className="bubble">
          {stage.s === "busy" ? t(stage.what) : stage.s === "pick" ? t("pickOne") : stage.s === "confirm" ? t("isThisIt") : message ?? t("photoDesc")}
        </div>
      </div>

      {photo && <img className="photo-preview" src={photo} alt="" />}

      {stage.s === "busy" && (
        <div className="row" style={{ justifyContent: "center" }}>
          <div className="spinner" role="status" aria-label={t(stage.what)} />
        </div>
      )}

      {stage.s === "pick" && (
        <div className="stack">
          {stage.tasks.map((task, i) => (
            <button key={i} className="diagram-choice" style={{ fontWeight: 800 }} onClick={() => setStage({ s: "confirm", text: task })}>
              {task}
            </button>
          ))}
        </div>
      )}

      {stage.s === "confirm" && (
        <div className="stack">
          <textarea
            className="answer-input"
            value={stage.text}
            onChange={(e) => setStage({ s: "confirm", text: e.target.value })}
            aria-label={t("isThisIt")}
          />
          <div className="row">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => buildLesson(stage.text, true)} disabled={!stage.text.trim()}>
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
                if (typed.trim()) buildLesson(typed, false);
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
        </div>
      )}

      <button className="btn btn-light" onClick={onHome}>
        ← {t("home")}
      </button>
    </div>
  );
}
