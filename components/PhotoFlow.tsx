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

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMessage(null);
    try {
      const dataUrl = await shrinkPhoto(file);
      setPhoto(dataUrl);
      if (!ai) {
        setMessage(t("aiOff"));
        setStage({ s: "start" });
        return;
      }
      setStage({ s: "busy", what: "reading" });
      const res = await fetch("/api/read-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.readable || data.tasks.length === 0) {
        setMessage(t(res.ok ? "notSupported" : res.status === 429 ? "busy" : "error"));
        setStage({ s: "start" });
      } else if (data.tasks.length === 1) {
        setStage({ s: "confirm", text: data.tasks[0] });
      } else {
        setStage({ s: "pick", tasks: data.tasks });
      }
    } catch {
      setMessage(t("error"));
      setStage({ s: "start" });
    }
  }

  async function buildLesson(text: string) {
    setMessage(null);
    setStage({ s: "busy", what: "thinking" });
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang, grade }),
      });
      const data = await res.json();
      if (res.ok) return setStage({ s: "lesson", lesson: data.lesson });
      setMessage(t(data.error === "ai_off" ? "aiOffWord" : data.error === "unsupported" ? "notSupported" : res.status === 429 ? "busy" : "error"));
      setStage({ s: "start" });
    } catch {
      setMessage(t("error"));
      setStage({ s: "start" });
    }
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
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => buildLesson(stage.text)} disabled={!stage.text.trim()}>
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
                if (typed.trim()) buildLesson(typed);
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
