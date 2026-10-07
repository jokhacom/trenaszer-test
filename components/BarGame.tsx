"use client";

import { useMemo, useState } from "react";
import { GENTLE_WRONG, PRAISE, tr } from "@/lib/i18n";
import { classifyInput, sameNumber, vary } from "@/lib/ladder";
import { makeBarProblem } from "@/lib/problems";
import { recordResult } from "@/lib/progress";
import type { BarSpec, Grade, Lang, Topic } from "@/lib/types";
import BarDiagram from "./BarDiagram";
import Celebrate from "./Celebrate";
import Listen from "./Listen";
import Zukko from "./Zukko";

const KINDS: BarSpec["kind"][] = ["total", "remain", "more", "less"];
const ADD = 1;
const SUB = 2;

function shuffle<T>(xs: T[]): T[] {
  return [...xs].sort(() => Math.random() - 0.5);
}

export default function BarGame({ lang, grade }: { lang: Lang; grade: Grade }) {
  const [round, setRound] = useState(0);
  const lesson = useMemo(() => makeBarProblem(lang, grade), [lang, grade, round]);
  const bar = lesson.bar!;
  const choices = useMemo(() => shuffle([bar.kind, ...shuffle(KINDS.filter((k) => k !== bar.kind)).slice(0, 2)]), [bar.kind, round]);

  const [stage, setStage] = useState<"pick" | "op" | "calc" | "done">("pick");
  const [wrongPicks, setWrongPicks] = useState<BarSpec["kind"][]>([]);
  const [note, setNote] = useState<string>(tr(lang, "barStep1"));
  const [mistakes, setMistakes] = useState(0);
  const [input, setInput] = useState("");

  const needOp = bar.kind === "total" || bar.kind === "more" ? ADD : SUB;
  const sign = needOp === ADD ? "+" : "−";

  function next() {
    setRound((r) => r + 1);
    setStage("pick");
    setWrongPicks([]);
    setNote(tr(lang, "barStep1"));
    setMistakes(0);
    setInput("");
  }

  function pickDiagram(k: BarSpec["kind"]) {
    if (k === bar.kind) {
      setStage("op");
      setNote(tr(lang, "barStep2"));
    } else {
      setWrongPicks((w) => [...w, k]);
      setMistakes((m) => m + 1);
      setNote(tr(lang, "barWrong"));
    }
  }

  function pickOp(v: number) {
    if (v === needOp) {
      setStage("calc");
      setNote(tr(lang, "barStep3"));
    } else {
      setMistakes((m) => m + 1);
      setNote(tr(lang, "barOpWrong"));
    }
  }

  function check() {
    const c = classifyInput(input);
    setInput("");
    if (c.kind !== "number") {
      setNote(tr(lang, "notNumber"));
      return;
    }
    if (sameNumber(c.value, lesson.answer)) {
      setStage("done");
      setNote(`${vary(PRAISE[lang], round)} ${tr(lang, "solvedSelf")}`);
      recordResult(lesson.topic as Topic, true, Math.min(mistakes, 3));
    } else {
      setMistakes((m) => m + 1);
      setNote(vary(GENTLE_WRONG[lang], mistakes));
    }
  }

  return (
    <div className="stack">
      {stage === "done" && <Celebrate />}
      <div className="task-card">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <span className="muted" style={{ fontWeight: 800 }}>{tr(lang, "yourTask")}</span>
          <Listen text={lesson.task} lang={lang} label />
        </div>
        <div className="task-text long">{lesson.task}</div>
      </div>

      <div className="zukko-row">
        <Zukko size={56} mood={stage === "done" ? "cheer" : mistakes > 0 ? "think" : "happy"} />
        <div className={`bubble${stage === "done" ? " bubble-good" : ""}`}>{note}</div>
      </div>

      {stage === "pick" ? (
        <div className="stack">
          {choices.map((k) => (
            <button
              key={k}
              className={`diagram-choice${wrongPicks.includes(k) ? " wrong" : ""}`}
              onClick={() => pickDiagram(k)}
              disabled={wrongPicks.includes(k)}
            >
              <BarDiagram spec={bar} lang={lang} kind={k} />
            </button>
          ))}
        </div>
      ) : (
        <div className="diagram-choice right">
          <BarDiagram spec={bar} lang={lang} />
        </div>
      )}

      {stage === "op" && (
        <div className="options">
          <button className="btn btn-blue" onClick={() => pickOp(ADD)}>
            + {lang === "uz" ? "qo‘shish" : lang === "ru" ? "сложить" : "add"}
          </button>
          <button className="btn btn-blue" onClick={() => pickOp(SUB)}>
            − {lang === "uz" ? "ayirish" : lang === "ru" ? "вычесть" : "subtract"}
          </button>
        </div>
      )}

      {stage === "calc" && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            check();
          }}
        >
          <div className="task-text" style={{ textAlign: "center" }}>
            {bar.a} {sign} {bar.b} = ?
          </div>
          <div className="answer-row">
            <input
              className="answer-input"
              autoComplete="off"
              placeholder={tr(lang, "answerPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label={tr(lang, "answerPlaceholder")}
            />
            <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
              {tr(lang, "check")}
            </button>
          </div>
        </form>
      )}

      {stage === "done" && (
        <button className="btn btn-primary btn-wide" onClick={next}>
          {tr(lang, "another")} →
        </button>
      )}
    </div>
  );
}
