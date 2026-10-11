"use client";

import { useEffect, useRef, useState } from "react";
import { GENTLE_WRONG, PRAISE, tr, type Key } from "@/lib/i18n";
import { vary } from "@/lib/ladder";
import { speak, stopSpeaking } from "@/lib/speech";
import type { Drill as DrillData, Grade, Lang } from "@/lib/types";
import Celebrate from "./Celebrate";
import Listen from "./Listen";
import Mirodil, { type Mood } from "./Mirodil";
import Slides from "./Slides";

export interface DrillResult {
  /** Every word found in the end. */
  solved: boolean;
  /** Help used, as in the ladder: 0 = none, 2 = some wrong choices, 3 = words left unsolved. */
  maxLevel: number;
}

/**
 * One rule + a mini-game: the rule is shown once, then the child chooses the
 * right spelling in every word of the exercise. A wrong choice brings a nudge
 * or the rule back, never the right word. A skipped word comes back once at
 * the end.
 */
export default function Drill({
  drill,
  grade,
  onDone,
  onNext,
  nextLabel,
}: {
  drill: DrillData;
  grade: Grade;
  onDone: (r: DrillResult) => void;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const lang: Lang = drill.lang;
  const t = (k: Key, vars: Record<string, number> = {}) =>
    Object.entries(vars).reduce((s, [k2, v]) => s.replace(`{${k2}}`, String(v)), tr(lang, k));
  const n = drill.items.length;

  const [phase, setPhase] = useState<"rule" | "play" | "done">("rule");
  const [queue, setQueue] = useState<number[]>(() => drill.items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [wrong, setWrong] = useState<Record<number, number>>({});
  const [solved, setSolved] = useState<number[]>([]);
  const [revisited, setRevisited] = useState<number[]>([]);
  const [note, setNote] = useState<{ text: string; good?: boolean } | null>(null);
  const [showRule, setShowRule] = useState(false);
  const [mood, setMood] = useState<Mood>("happy");
  const reported = useRef(false);
  const seed = useRef(0);

  const current = queue[pos];
  const item = drill.items[current];
  const firstTry = solved.filter((i) => !wrong[i]).length;
  const left = n - solved.length;

  useEffect(() => () => stopSpeaking(), []);
  // First-graders often can't read yet: the rule and each word are read aloud.
  useEffect(() => {
    if (grade !== 1) return;
    if (phase === "rule") speak(drill.rule, lang);
    else if (phase === "play" && item) speak(item.prompt, lang);
  }, [phase, current, grade, lang, drill.rule, item]);

  function finish(finalSolved: number[]) {
    setPhase("done");
    setMood("cheer");
    if (reported.current) return;
    reported.current = true;
    const all = finalSolved.length === n;
    const anyWrong = Object.values(wrong).some((w) => w > 0);
    onDone({ solved: all, maxLevel: !all ? 3 : anyWrong ? 2 : 0 });
  }

  function next(nextQueue = queue, finalSolved = solved) {
    setNote(null);
    setShowRule(false);
    if (pos + 1 >= nextQueue.length) return finish(finalSolved);
    setPos(pos + 1);
    setMood("happy");
    // A word skipped earlier comes back: say so.
    if (revisited.includes(nextQueue[pos + 1])) setNote({ text: t("drillAgain") });
  }

  function choose(option: number) {
    if (solved.includes(current)) return;
    if (option === item.answer) {
      const nowSolved = [...solved, current];
      setSolved(nowSolved);
      setMood("cheer");
      setNote({ text: vary(PRAISE[lang], seed.current++), good: true });
      setTimeout(() => next(queue, nowSolved), 800);
      return;
    }
    const count = (wrong[current] ?? 0) + 1;
    setWrong({ ...wrong, [current]: count });
    setMood("think");
    // First a nudge for this word, then the rule itself.
    const nudge = count === 1 && item.hint ? item.hint : `${t("drillRemember")} ${drill.rule}`;
    setNote({ text: `${vary(GENTLE_WRONG[lang], seed.current++)}\n${nudge}` });
  }

  function skip() {
    let nextQueue = queue;
    if (!revisited.includes(current)) {
      nextQueue = [...queue, current];
      setQueue(nextQueue);
      setRevisited([...revisited, current]);
    }
    next(nextQueue);
  }

  function leave() {
    onNext?.();
  }

  return (
    <div className="stack">
      {phase === "done" && left === 0 && <Celebrate />}
      <div className="task-card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <span className="muted" style={{ fontWeight: 800 }}>
            {tr(lang, "yourTask")}
          </span>
          <Listen text={drill.task} lang={lang} label />
        </div>
        <div className="task-text long">{drill.task}</div>
      </div>

      {phase === "rule" && (
        <>
          <div className="mirodil-row">
            <Mirodil size={56} mood="happy" />
            <div className="bubble">
              <span className="bubble-title">{tr(lang, "drillRule")}</span>
              {drill.rule}
              {drill.example.length > 0 && <Slides frames={drill.example} lang={lang} autoSpeak={grade === 1} />}
              <div style={{ marginTop: 8 }}>
                <Listen text={drill.rule} lang={lang} hideIfUnavailable />
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-wide" style={{ minHeight: 68 }} onClick={() => setPhase("play")}>
            {tr(lang, "drillStart")}
          </button>
        </>
      )}

      {phase === "play" && item && (
        <>
          <div className="progress" aria-label={t("drillProgress", { i: Math.min(solved.length + 1, n), n })}>
            {drill.items.map((_, i) => (
              <i key={i} className={solved.includes(i) ? "done" : i === current ? "now" : ""} />
            ))}
          </div>
          <div className="task-card" style={{ textAlign: "center" }}>
            <div className="muted" style={{ fontWeight: 800 }}>
              {t("drillProgress", { i: Math.min(solved.length + 1, n), n })} · {tr(lang, "drillPick")}
            </div>
            <div className="task-text" style={{ margin: "8px 0" }}>
              {item.prompt}
            </div>
            {item.context && (
              <div className="muted" style={{ fontSize: 17 }}>
                {item.context}
              </div>
            )}
          </div>
          <div className="options">
            {item.options.map((o, i) => (
              <button
                key={`${current}-${i}`}
                className={`btn ${solved.includes(current) && i === item.answer ? "btn-primary" : "btn-blue"}`}
                style={{ minHeight: 64, fontSize: 22 }}
                onClick={() => choose(i)}
              >
                {o}
              </button>
            ))}
          </div>
          {note && (
            <div className="mirodil-row">
              <Mirodil size={56} mood={mood} />
              <div className={`bubble${note.good ? " bubble-good" : ""}`} style={{ whiteSpace: "pre-line" }}>
                {note.text}
              </div>
            </div>
          )}
          {showRule && (
            <div className="bubble">
              <span className="bubble-title">{tr(lang, "drillRule")}</span>
              {drill.rule}
            </div>
          )}
          {!solved.includes(current) && (
            <div className="row">
              <button className="btn btn-light" style={{ flex: 1 }} onClick={() => setShowRule(!showRule)}>
                📏 {tr(lang, "drillShowRule")}
              </button>
              {(wrong[current] ?? 0) >= 2 && (
                <button className="btn btn-light" style={{ flex: 1 }} onClick={skip}>
                  ⏭️ {tr(lang, "drillLater")}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {phase === "done" && (
        <>
          <div className="mirodil-row">
            <Mirodil size={72} mood={left === 0 ? "cheer" : "happy"} />
            <div className="bubble bubble-good">
              {t("drillDone", { a: firstTry, n })}
              {left > 0 && <div style={{ marginTop: 8 }}>{t("drillLeft", { k: left })}</div>}
            </div>
          </div>
          {onNext && (
            <button className="btn btn-primary btn-wide" onClick={leave}>
              {nextLabel ?? tr(lang, "another")} →
            </button>
          )}
        </>
      )}
    </div>
  );
}
