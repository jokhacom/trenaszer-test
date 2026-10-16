"use client";

import { useEffect, useRef, useState } from "react";
import { GENTLE_WRONG, PRAISE, tr, type Key } from "@/lib/i18n";
import { matchesText } from "@/lib/answers";
import { classifyInput, sameNumber, vary, WRONG_BEFORE_STEP_UP, type Level } from "@/lib/ladder";
import { helpOrder, preferredHelp, recordHelp, type Method } from "@/lib/methods";
import { WORD_TOPICS } from "@/lib/problems";
import { recordFeel, recordWay, type Feel, type Way } from "@/lib/reflect";
import { award } from "@/lib/rewards";
import { speak, stopSpeaking } from "@/lib/speech";
import type { Frame, Grade, Lang, Lesson, Step, Visual as V } from "@/lib/types";
import Celebrate from "./Celebrate";
import Slides from "./Slides";
import Visual from "./Visual";
import Listen from "./Listen";
import Mirodil, { type Mood } from "./Mirodil";

const HELP_RANK: Record<Method, number> = { example: 1, hint: 1, question: 2, together: 3 };

export type Game = "bar" | "bonds" | "times";

/** A game that teaches the same thing another way, for a child who is stuck; null outside maths. */
export function gameFor(lesson: Lesson): Game | null {
  if (lesson.topic !== "other") {
    if (WORD_TOPICS.includes(lesson.topic)) return "bar";
    return ["mult", "div", "mult2d"].includes(lesson.topic) ? "times" : "bonds";
  }
  if (lesson.subject && lesson.subject !== "math") return null;
  if (lesson.bar || lesson.own?.kind === "bar") return "bar";
  return /[×:÷]|умнож|дел|ko‘payt|bo‘l|times|divide/i.test(lesson.task) ? "times" : "bonds";
}

const WAYS: [Way, Key][] = [
  ["picture", "wayPicture"],
  ["steps", "waySteps"],
  ["rule", "wayRule"],
  ["guess", "wayGuess"],
];
const FEELS: [Feel, Key][] = [
  ["easy", "feelEasy"],
  ["ok", "feelOk"],
  ["hard", "feelHard"],
];

interface Msg {
  from: "mirodil" | "kid";
  text: string;
  title?: string;
  lines?: string[];
  frames?: Frame[];
  visual?: V;
  good?: boolean;
  /** A big sticker Mirodil sends with praise. */
  sticker?: string;
}

/** Stickers Mirodil sends when the child solves a task. */
const REACTIONS = ["🎉", "👏", "🌟", "💪", "🥳", "🏆", "🦁", "🚀"];

type Pending = { kind: "question" } | { kind: "together"; i: number } | null;

export interface LadderResult {
  solved: boolean;
  /** Highest help level used: 0 = none, 1 = example, 2 = question, 3 = solved together. */
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
  onGame,
}: {
  lesson: Lesson;
  grade: Grade;
  onDone: (r: LadderResult) => void;
  onNext?: () => void;
  nextLabel?: string;
  /** Opens a game when the child is stuck (the ladder offers it after two calls for help). */
  onGame?: (g: Game) => void;
}) {
  const lang: Lang = lesson.lang;
  const t = (k: Key) => tr(lang, k);
  // When the child is stuck, a solved similar example with pictures comes first
  // (Singapore: concrete → pictorial → abstract). Without an example, a hint.
  const hasExample = (lesson.exampleFrames?.length ?? 0) > 0 || lesson.example.length > 0;
  // The kind of help that worked for this child before comes first.
  const [levels] = useState<Level[]>(() => [
    "try",
    ...helpOrder([hasExample ? "example" : "hint", "question", "together"], preferredHelp()),
  ]);
  const kind = lesson.answerKind ?? "number";

  const [level, setLevel] = useState<Level>("try");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "mirodil", text: t(lesson.answerKind === "choice" ? "tryChoose" : "tryAlone") }]);
  const [pending, setPending] = useState<Pending>(null);
  const [wrong, setWrong] = useState(0);
  const [solved, setSolved] = useState(false);
  const [paused, setPaused] = useState(false);
  const [otherShown, setOtherShown] = useState(false);
  // How many times the child went up the ladder (asked for help, said "I don't know", or missed twice).
  const [ups, setUps] = useState(0);
  const [way, setWay] = useState<Way | null>(null);
  const [feel, setFeel] = useState<Feel | null>(null);
  const game = onGame ? gameFor(lesson) : null;
  const [input, setInput] = useState("");
  const [mood, setMood] = useState<Mood>("happy");
  const reported = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const seed = useRef(0);

  const levelIndex = levels.indexOf(level);
  // How much help was used, by its kind (not by its place in the order): 1 example or hint, 2 question, 3 together.
  const shown = levels.slice(1, levelIndex + 1) as Method[];
  const helpUsed = Math.max(0, ...shown.map((m) => HELP_RANK[m]));

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
    recordHelp(shown, r.solved);
    onDone(r);
  }

  const say = (...m: Msg[]) => setMsgs((xs) => [...xs, ...m]);

  function stepPrompt(s: Step): Msg {
    return { from: "mirodil", text: s.prompt, visual: s.visual };
  }

  /** Moves one rung up the ladder. Never reveals the answer. */
  function stepUp(lead?: Msg) {
    const extra: Msg[] = lead ? [lead] : [];
    setUps((n) => n + 1);
    setWrong(0);
    setMood("think");
    if (levelIndex === levels.length - 1) {
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
      say(...extra, { from: "mirodil", title: t(TITLE.question), text: lesson.question.prompt, visual: lesson.question.visual });
      setPending({ kind: "question" });
    } else if (next === "example") {
      say(
        ...extra,
        lesson.exampleFrames?.length
          ? { from: "mirodil", title: t(TITLE.example), text: t("exampleIntro"), frames: lesson.exampleFrames }
          : { from: "mirodil", title: t(TITLE.example), text: t("exampleNow"), lines: lesson.example },
      );
      setPending(null);
    } else if (next === "together") {
      say(...extra, { from: "mirodil", title: t(TITLE.together), text: lesson.together[0].prompt, visual: lesson.together[0].visual });
      setPending({ kind: "together", i: 0 });
    }
  }

  function win() {
    setSolved(true);
    setPending(null);
    setMood("cheer");
    say({
      from: "mirodil",
      good: true,
      text: `${vary(PRAISE[lang], seed.current++)} ${t(helpUsed === 0 ? "praiseAlone" : helpUsed < 3 ? "praiseAfterHelp" : "praiseTogether")}`,
      sticker: vary(REACTIONS, seed.current++),
    });
    report({ solved: true, maxLevel: helpUsed });
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
    // The child's own final answer (for "choice" lessons, the index of the option).
    if (sameNumber(value, lesson.answer)) win();
    else wrongFinal();
  }

  function wrongFinal() {
    if (wrong + 1 >= WRONG_BEFORE_STEP_UP) {
      stepUp({ from: "mirodil", text: vary(GENTLE_WRONG[lang], seed.current++) });
    } else {
      setWrong(wrong + 1);
      setMood("think");
      say({ from: "mirodil", text: vary(GENTLE_WRONG[lang], seed.current++) });
    }
  }

  function submit(raw: string) {
    // A written answer (a word or phrase) for the child's own task.
    if (!pending && kind === "text") {
      const text = raw.trim();
      setInput("");
      if (!text) return;
      say({ from: "kid", text });
      if (matchesText(text, lesson.accepted ?? [])) return win();
      const c = classifyInput(text);
      if (c.kind === "askAnswer") return stepUp({ from: "mirodil", text: t("refuse") });
      if (c.kind === "stuck") return stepUp({ from: "mirodil", text: t("stuck") });
      return wrongFinal();
    }
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
    if (!solved) report({ solved: false, maxLevel: helpUsed });
    onNext?.();
  }

  // Buttons instead of typing: a step with options, or a "choice" lesson's final answer.
  const options =
    (pending?.kind === "question" ? lesson.question.options : pending?.kind === "together" ? lesson.together[pending.i].options : undefined) ??
    (!pending && kind === "choice" ? (lesson.choices ?? []).map((label, value) => ({ label, value })) : undefined);
  const step: Step | null =
    pending?.kind === "question" ? lesson.question : pending?.kind === "together" ? lesson.together[pending.i] : null;
  const isLong = lesson.task.length > 40;
  const ownPicture: V | undefined = lesson.own ?? (lesson.bar ? { kind: "bar", spec: lesson.bar } : undefined);

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
        {levelIndex > 0 && ownPicture && <Visual v={ownPicture} lang={lang} />}
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
                {m.sticker && (
                  <div>
                    <span className="sticker-pop" aria-hidden>
                      {m.sticker}
                    </span>
                  </div>
                )}
                {m.frames && <Slides frames={m.frames} lang={lang} autoSpeak={grade === 1} />}
                {m.visual && <Visual v={m.visual} lang={lang} />}
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
          {options ? (
            <div className="options">
              {options.map((o) => (
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
          {game && (ups >= 2 || paused) && (
            <button className="btn btn-pink btn-wide" onClick={() => onGame!(game)}>
              {t("stuckGame")}
            </button>
          )}
          {paused && onNext && (
            <button className="btn btn-pink btn-wide" onClick={leave}>
              {nextLabel ?? t("skip")}
            </button>
          )}
        </div>
      )}

      {/* Thinking about one's own thinking: how did you solve it, how did it feel (Singapore syllabus: metacognition). */}
      {solved && !feel && (
        <div className="card stack reflect">
          <b>{t(way ? "reflectFeel" : "reflectWay")}</b>
          <div className="row">
            {(way ? FEELS : WAYS).map(([k, label]) => (
              <button
                key={k}
                className="btn btn-light btn-small"
                onClick={() => {
                  const topic = lesson.topic;
                  if (!way) {
                    setWay(k as Way);
                    recordWay(topic, k as Way);
                    return;
                  }
                  setFeel(k as Feel);
                  recordFeel(topic, k as Feel);
                  const reply: Key = way === "guess" ? "afterGuess" : k === "hard" ? "afterHard" : k === "easy" ? "afterEasy" : "afterOk";
                  say({ from: "mirodil", text: t(reply) });
                }}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>
      )}

      {solved && lesson.otherWay && !otherShown && (
        <button
          className="btn btn-light btn-wide"
          onClick={() => {
            setOtherShown(true);
            // A candy for curiosity: looking for another way is part of the Singapore approach.
            award(1);
            say({ from: "mirodil", title: t("otherWayTitle"), text: lesson.otherWay! });
          }}
        >
          💡 {t("otherWayAsk")}
        </button>
      )}

      {solved && onNext && (
        <button className="btn btn-primary btn-wide" onClick={leave}>
          {nextLabel ?? t("another")} →
        </button>
      )}
    </div>
  );
}
