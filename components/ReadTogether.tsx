"use client";

import { useEffect, useMemo, useState } from "react";
import { GENTLE_WRONG, PRAISE, tr } from "@/lib/i18n";
import { vary } from "@/lib/ladder";
import { recordReading } from "@/lib/progress";
import { speak, stopSpeaking } from "@/lib/speech";
import { STORIES, type Story } from "@/lib/stories";
import type { Grade, Lang } from "@/lib/types";
import Celebrate from "./Celebrate";
import Listen from "./Listen";
import Mirodil from "./Mirodil";

/**
 * Read together (Singapore STELLAR, shared reading): the story is read aloud,
 * then questions about it. A wrong answer highlights the sentence to reread —
 * Mirodil never names the right option.
 */
export default function ReadTogether({ lang, grade, onHome }: { lang: Lang; grade: Grade; onHome: () => void }) {
  const [story, setStory] = useState<Story | null>(null);

  if (!story) {
    return (
      <div className="stack">
        <div className="mirodil-row">
          <Mirodil size={72} />
          <div className="bubble">{tr(lang, "readPick")}</div>
        </div>
        <div className="stack">
          {STORIES.map((s) => (
            <button key={s.id} className="btn btn-blue btn-wide" style={{ justifyContent: "space-between", minHeight: 76 }} onClick={() => setStory(s)}>
              <span>
                <span style={{ fontSize: 30, marginRight: 10 }}>{s.emoji}</span>
                {s.text[lang].title}
              </span>
              <span aria-hidden>→</span>
            </button>
          ))}
        </div>
        <button className="btn btn-light" onClick={onHome}>
          ← {tr(lang, "home")}
        </button>
      </div>
    );
  }
  return <StoryView key={story.id} story={story} lang={lang} grade={grade} onBack={() => setStory(null)} />;
}

function shuffled(n: number, seed: string): number[] {
  // Same order for the same question, different from the stored one.
  const idx = Array.from({ length: n }, (_, i) => i);
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  for (let i = n - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

function StoryView({ story, lang, grade, onBack }: { story: Story; lang: Lang; grade: Grade; onBack: () => void }) {
  const text = story.text[lang];
  const [stage, setStage] = useState<"read" | "questions" | "done">("read");
  const [qi, setQi] = useState(0);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [wrongHere, setWrongHere] = useState<number[]>([]);
  const q = text.questions[qi];
  const order = useMemo(() => (q ? shuffled(q.options.length, `${story.id}${lang}${qi}`) : []), [q, story.id, lang, qi]);
  const whole = text.sentences.join(" ");

  // First-graders often can't read yet: the story is read aloud by itself.
  useEffect(() => {
    if (grade === 1 && stage === "read") speak(whole, lang);
    return () => stopSpeaking();
  }, [grade, stage, whole, lang]);

  function answer(option: number) {
    if (option === q.correct) {
      if (wrongHere.length === 0) setFirstTry((n) => n + 1);
      setHighlight(null);
      setWrongHere([]);
      if (qi + 1 >= text.questions.length) {
        setStage("done");
        recordReading(story.id, firstTry + (wrongHere.length === 0 ? 1 : 0), text.questions.length);
      } else {
        setNote(vary(PRAISE[lang], qi));
        setQi(qi + 1);
      }
      return;
    }
    // Wrong: back to the text, to the sentence that holds the answer.
    setMistakes((m) => m + 1);
    setWrongHere((w) => [...w, option]);
    setHighlight(q.evidence);
    setNote(`${vary(GENTLE_WRONG[lang], mistakes)} ${tr(lang, "readLookAgain")}`);
    if (grade === 1) speak(text.sentences[q.evidence], lang);
  }

  return (
    <div className="stack">
      {stage === "done" && <Celebrate />}
      <div className="task-card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <h2>
            {story.emoji} {text.title}
          </h2>
          <Listen text={whole} lang={lang} label />
        </div>
        <p className="story">
          {text.sentences.map((s, i) => (
            <span key={i} className={i === highlight ? "story-mark" : undefined}>
              {s}{" "}
            </span>
          ))}
        </p>
      </div>

      {stage === "read" && (
        <>
          <div className="mirodil-row">
            <Mirodil size={56} />
            <div className="bubble">{tr(lang, "readFirst")}</div>
          </div>
          <button className="btn btn-primary btn-wide" onClick={() => setStage("questions")}>
            {tr(lang, "readQuestions")} →
          </button>
        </>
      )}

      {stage === "questions" && q && (
        <>
          <div className="progress" aria-label={`${qi + 1} / ${text.questions.length}`}>
            {text.questions.map((_, j) => (
              <i key={j} className={j < qi ? "done" : j === qi ? "now" : ""} />
            ))}
          </div>
          {note && (
            <div className="mirodil-row">
              <Mirodil size={56} mood={highlight !== null ? "think" : "happy"} />
              <div className={`bubble${highlight === null ? " bubble-good" : ""}`}>{note}</div>
            </div>
          )}
          <div className="mirodil-row">
            {!note && <Mirodil size={56} />}
            <div className="bubble">
              <b>{q.q}</b>
              <div style={{ marginTop: 8 }}>
                <Listen text={q.q} lang={lang} hideIfUnavailable />
              </div>
            </div>
          </div>
          <div className="stack">
            {order.map((i) => (
              <button
                key={i}
                className={`btn ${wrongHere.includes(i) ? "btn-light" : "btn-blue"} btn-wide`}
                disabled={wrongHere.includes(i)}
                onClick={() => answer(i)}
              >
                {q.options[i]}
              </button>
            ))}
          </div>
        </>
      )}

      {stage === "done" && (
        <div className="card stack" style={{ textAlign: "center", justifyItems: "center" }}>
          <Mirodil size={96} mood="cheer" />
          <h2>{tr(lang, "readDone")}</h2>
          <div className="stars" aria-hidden>
            {"⭐".repeat(Math.max(firstTry, 1))}
          </div>
          <p style={{ margin: 0 }}>
            {tr(lang, "readFirstTry")} {firstTry} / {text.questions.length}
          </p>
        </div>
      )}

      <button className="btn btn-light" onClick={onBack}>
        ← {tr(lang, "readOther")}
      </button>
    </div>
  );
}
