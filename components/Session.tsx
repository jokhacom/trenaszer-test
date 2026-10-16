"use client";

import { useMemo, useRef, useState } from "react";
import { tr } from "@/lib/i18n";
import { makeLesson, TOPIC_NAMES } from "@/lib/problems";
import { loadProgress, recordResult, sessionTopics, weakTopics } from "@/lib/progress";
import { warmUpFor } from "@/lib/readiness";
import type { Grade, Lang, Topic } from "@/lib/types";
import Celebrate from "./Celebrate";
import Ladder, { type Game, type LadderResult } from "./Ladder";
import Mirodil from "./Mirodil";

const TASKS = 5;
const MINUTES = 10;

/**
 * A 10-minute lesson (Singapore phases): a warm-up when a new topic needs an
 * earlier one (readiness), tasks with weak topics first (engagement and
 * practice), then a summary of what was practised and what comes next.
 */
export default function Session({ lang, grade, onHome, onGame }: { lang: Lang; grade: Grade; onHome: () => void; onGame?: (g: Game) => void }) {
  const { topics, warmUp } = useMemo(() => {
    const plan = sessionTopics(grade, TASKS);
    const warm = warmUpFor(plan, loadProgress());
    return warm ? { topics: [warm, ...plan.slice(0, TASKS - 1)], warmUp: true } : { topics: plan, warmUp: false };
  }, [grade]);
  const lessons = useMemo(() => topics.map((t) => makeLesson(t, lang, grade)), [topics, lang, grade]);
  const started = useRef(Date.now());
  const [i, setI] = useState(0);
  const [results, setResults] = useState<(LadderResult & { topic: Topic })[]>([]);
  const [finished, setFinished] = useState<"" | "done" | "time">("");

  function done(r: LadderResult) {
    const topic = topics[i];
    recordResult(topic, r.solved, r.maxLevel);
    setResults((xs) => [...xs, { ...r, topic }]);
  }

  function next() {
    const timeUp = Date.now() - started.current > MINUTES * 60_000;
    if (i + 1 >= lessons.length || timeUp) setFinished(timeUp ? "time" : "done");
    else setI(i + 1);
  }

  if (finished) {
    const self = results.filter((r) => r.solved).length;
    const practised = [...new Set(results.map((r) => r.topic))];
    // What comes next: a topic that is still hard, so the next lesson has a clear aim.
    const nextTopic = weakTopics(grade)[0];
    return (
      <div className="stack">
        <Celebrate />
        <div className="card stack" style={{ textAlign: "center", justifyItems: "center" }}>
          <Mirodil size={110} mood="cheer" />
          <h1>{tr(lang, finished === "time" ? "timeUp" : "sessionDone")}</h1>
          <div className="stars" aria-hidden>
            {"⭐".repeat(Math.max(self, 1))}
          </div>
          <p style={{ margin: 0, fontWeight: 800 }}>
            {tr(lang, "sessionSolved")} {self} / {results.length}
          </p>
          <b>{tr(lang, "summaryPractised")}</b>
          <ul className="muted" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
            {practised.map((t) => (
              <li key={t}>{TOPIC_NAMES[t][lang]}</li>
            ))}
          </ul>
          {nextTopic && <p style={{ margin: 0 }}>{tr(lang, "summaryNext").replace("{topic}", TOPIC_NAMES[nextTopic][lang])}</p>}
          <h2>{tr(lang, "comeTomorrow")}</h2>
          <button className="btn btn-primary btn-wide" onClick={onHome}>
            {tr(lang, "home")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="progress" aria-label={`${i + 1} / ${lessons.length}`}>
        {lessons.map((_, j) => (
          <i key={j} className={j < i ? "done" : j === i ? "now" : ""} />
        ))}
      </div>
      {warmUp && i === 0 && (
        <div className="bubble">
          🤸 {tr(lang, "warmUp")}
        </div>
      )}
      <Ladder
        key={i}
        onGame={onGame}
        lesson={lessons[i]}
        grade={grade}
        onDone={done}
        onNext={next}
        nextLabel={i + 1 >= lessons.length ? tr(lang, "sessionDone") : tr(lang, "next")}
      />
    </div>
  );
}
