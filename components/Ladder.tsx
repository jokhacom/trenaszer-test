"use client";

import { useEffect, useRef, useState } from "react";
import { GENTLE_WRONG, PRAISE, tr, type Key } from "@/lib/i18n";
import { classifyInput, LEVELS, sameNumber, vary, WRONG_BEFORE_STEP_UP, type Level } from "@/lib/ladder";
import { speak, stopSpeaking } from "@/lib/speech";
import type { Grade, Lang, Lesson, Step } from "@/lib/types";
import BarDiagram from "./BarDiagram";
import Celebrate from "./Celebrate";
import Listen from "./Listen";
import Mirodil, { type Mood } from "./Mirodil";

interface Msg {
  from: "mirodil" | "kid";
  text: string;
  title?: string;
  lines?: string[];
  good?: boolean;
}

type Pending = { kind: "question" } | { kind: "together"; i: number } | null;

export interface LadderResult {
  solved: boolean;
  /** Highest help level used: 0 = none … 4 = solved together. */
  maxLevel: number;
}

const TITLE: Record<Exclude<Level, "try">, Key> = {
  hint: "levelHint",
  question: "levelQuestion",
  example: "levelExample",
  together: "levelTogether",
};

export default function Ladder({
  lesson,
  grade,
  onDone,
  onNext,
  nextLabel,
}: {
  lesson: Lesson;
  grade: Grade;
  onDone: (r: LadderResult) => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const lang: Lang = lesson.lang;
  const t = (k: Key) => tr(lang, k);
  const levels = LEVELS.filter((l) => l !== "example" || lesson.example.length > 0);

  const [level, setLevel] = useState<Level>("try");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "mirodil", text: t("tryAlone") }]);
  const [pending, setPending] = useState<Pending>(null);
  const [wrong, setWrong] = useState(0);
  const [solved, setSolved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [input, setInput] = useState("");
  const [mood, setMood] = useState<Mood>("happy");
  const reported = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const seed = useRef(0);

  const levelIndex = levels.indexOf(level);

  // First-graders often can't read yet: Mirodil reads every new message aloud.
  const lastSpoken = useRef(-1);
  useEffect(() => {
    const i = msgs.length - 1;
    const m = msgs[i];
    if (grade === 1 && m.from === "mirodil" && i !== lastSpoken.current) {
      lastSpoken.current = i;
      speak([m.text, ...(m.lines ?? [])].join(". "), lang);
    }
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, grade, lang]);

  useEffect(() => () => stopSpeaking(), []);

  function report(r: LadderResult) {
    if (reported.current) return;
    reported.current = true;
    onDone(r);
  }

  const say = (...m: Msg[]) => setMsgs((xs) => [...xs, ...m]);

  function stepPrompt(s: Step): Msg {
    return { from: "mirodil", text: s.prompt };
  }

  /** Moves one rung up the ladder. Never reveals the answer. */
  function stepUp(lead?: Msg) {
    const extra: Msg[] = lead ? [lead] : [];
    setWrong(0);
    setMood("think");
    if (level === "together") {
      // Top of the ladder: suggest a break instead of the answer.
      setPaused(true);
      const cur = pending?.kind === "together" ? lesson.together[pending.i] : null;
      say(...extra, { from: "mirodil", text: t("pause") }, ...(cur ? [stepPrompt(cur)] : []));
      return;
    }
    const next = levels[Math.min(levelIndex + 1, levels.length - 1)];
    setLevel(next);
    if (next === "hint") {
      say(...extra, { from: "mirodil", title: t(TITLE.hint), text: lesson.hint });
      setPending(null);
    } else if (next === "question") {
      say(...extra, { from: "mirodil", title: t(TITLE.question), text: lesson.question.prompt });
      setPending({ kind: "question" });
    } else if (next === "example") {
      say(...extra, { from: "mirodil", title: t(TITLE.example), text: t("exampleNow"), lines: lesson.example });
      setPending(null);
    } else if (next === "together") {
      say(...extra, { from: "mirodil", title: t(TITLE.together), text: lesson.together[0].prompt });
      setPending({ kind: "together", i: 0 });
    }
  }

  function win() {
    setSolved(true);
    setPending(null);
    setMood("cheer");
    say({ from: "mirodil", good: true, text: `${vary(PRAISE[lang], seed.current++)} ${t("solvedSelf")}\n\n${t("whyQuestion")}` });
    report({ solved: true, maxLevel: levelIndex });
  }

  function answerNumber(value: number, shown: string) {
    say({ from: "kid", text: shown });
    if (pending?.kind === "question") {
      if (sameNumber(value, lesson.question.expect)) {
        setWrong(0);
        setPending(null);
        setMood("happy");
        say({ from: "mirodil", good: true, text: `${t("stepRight")} ${t("nowFinal")}` });
      } else if (wrong + 1 >= WRONG_BEFORE_STEP_UP) {
        stepUp({ from: "mirodil", text: t("stepTryAgain") });
      } else {
        setWrong(wrong + 1);
        say({ from: "mirodil", text: t("stepTryAgain") });
      }
      return;
    }
    if (pending?.kind === "together") {
      const step = lesson.together[pending.i];
      if (sameNumber(value, step.expect)) {
        setWrong(0);
        if (pending.i === lesson.together.length - 1) {
          win();
        } else {
          setPending({ kind: "together", i: pending.i + 1 });
          setMood("happy");
          say({ from: "mirodil", good: true, text: t("stepRight") }, stepPrompt(lesson.together[pending.i + 1]));
        }
      } else {
        setWrong(wrong + 1);
        say({ from: "mirodil", text: wrong + 1 >= 3 ? `${t("stepTryAgain")}\n${t("pause")}` : t("stepTryAgain") });
        if (wrong + 1 >= 3) setPaused(true);
      }
      return;
    }
    // The child's own final answer.
    if (sameNumber(value, lesson.answer)) {
      win();
    } else if (wrong + 1 >= WRONG_BEFORE_STEP_UP) {
      stepUp({ from: "mirodil", text: vary(GENTLE_WRONG[lang], seed.current++) });
    } else {
      setWrong(wrong + 1);
      setMood("think");
      say({ from: "mirodil", text: vary(GENTLE_WRONG[lang], seed.current++) });
    }
  }

  function submit(raw: string) {
    const c = classifyInput(raw);
    setInput("");
    if (c.kind === "empty") return;
    if (c.kind === "number") return answerNumber(c.value, raw.trim());
    say({ from: "kid", text: raw.trim() });
    if (c.kind === "askAnswer") return stepUp({ from: "mirodil", text: t("refuse") });
    if (c.kind === "stuck") return stepUp({ from: "mirodil", text: t("stuck") });
    say({ from: "mirodil", text: t("notNumber") });
  }

  function leave() {
    if (!solved) report({ solved: false, maxLevel: levelIndex });
    onNext?.();
  }

  const step: Step | null =
    pending?.kind === "question" ? lesson.question : pending?.kind === "together" ? lesson.together[pending.i] : null;
  const isLong = lesson.task.length > 40;

  return (
    <div className="stack">
      {solved && <Celebrate />}
      <div className="task-card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <span className="muted" style={{ fontWeight: 800 }}>
            {t("yourTask")}
          </span>
          <Listen text={lesson.task} lang={lang} label />
        </div>
        <div className={`task-text${isLong ? " long" : ""}`}>{lesson.task}</div>
        {lesson.bar && levelIndex >= levels.indexOf("hint") && levelIndex > 0 && (
          <BarDiagram spec={lesson.bar} lang={lang} />
        )}
      </div>

      <div className="chat" aria-live="polite">
        {msgs.map((m, i) =>
          m.from === "kid" ? (
            <div key={i} className="bubble bubble-kid">
              {m.text}
            </div>
          ) : (
            <div key={i} className="mirodil-row">
              {i === msgs.length - 1 || msgs[i + 1]?.from === "kid" ? <Mirodil size={56} mood={mood} /> : <div style={{ width: 56 }} />}
              <div className={`bubble${m.good ? " bubble-good" : ""}`}>
                {m.title && <span className="bubble-title">{m.title}</span>}
                {m.text}
                {m.lines && (
                  <ul className="example-lines">
                    {m.lines.map((l, j) => (
                      <li key={j}>{l}</li>
                    ))}
                  </ul>
                )}
                <div style={{ marginTop: 8 }}>
                  <Listen text={[m.text, ...(m.lines ?? [])].join(". ")} lang={lang} hideIfUnavailable />
                </div>
              </div>
            </div>
          ),
        )}
        <div ref={bottom} />
      </div>

      {!solved && (
        <div className="stack">
          {step?.options ? (
            <div className="options">
              {step.options.map((o) => (
                <button key={o.value} className="btn btn-blue" onClick={() => answerNumber(o.value, o.label)}>
                  {o.label}
                </button>
              ))}
            </div>
          ) : (
            <form
              className="answer-row"
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              <input
                className="answer-input"
                inputMode="text"
                autoComplete="off"
                placeholder={t("answerPlaceholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label={t("answerPlaceholder")}
              />
              <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
                {t("check")}
              </button>
            </form>
          )}
          <div className="row">
            <button className="btn btn-light" onClick={() => stepUp()} style={{ flex: 1 }}>
              🙋 {t("helpMe")}
            </button>
            <button className="btn btn-light" onClick={() => submit(t("dontKnow"))} style={{ flex: 1 }}>
              🤔 {t("dontKnow")}
            </button>
          </div>
          {paused && onNext && (
            <button className="btn btn-pink btn-wide" onClick={leave}>
              {nextLabel ?? t("skip")}
            </button>
          )}
        </div>
      )}

      {solved && onNext && (
        <button className="btn btn-primary btn-wide" onClick={leave}>
          {nextLabel ?? t("another")} →
        </button>
      )}
    </div>
  );
}
