"use client";

import { useMemo, useRef, useState } from "react";
import { GENTLE_WRONG, PRAISE, tr, type Key } from "@/lib/i18n";
import { vary } from "@/lib/ladder";
import { markToday } from "@/lib/progress";
import { award } from "@/lib/rewards";
import { answerOf, choicesFor, factKey, makeFact, missedFacts, saveMissed, tablesFor, type Fact } from "@/lib/times";
import type { Grade, Lang } from "@/lib/types";
import Celebrate from "./Celebrate";
import Mirodil, { type Mood } from "./Mirodil";
import Visual from "./Visual";

const ROUND = 10;
const EMOJI = ["🍎", "⭐", "🍇", "🐟", "🌸", "🍪"];

/** Ten facts: missed ones from last time first, the rest from the chosen tables. */
function plan(grade: Grade, tables: number[]): Fact[] {
  const earlier = missedFacts().filter((f) => tables.includes(f.b) && (grade >= 2 || f.op === "mul"));
  const out = [...earlier];
  const seen = new Set(out.map(factKey));
  for (let i = 0; out.length < ROUND && i < 200; i++) {
    const f = makeFact(grade, tables);
    if (!seen.has(factKey(f))) {
      seen.add(factKey(f));
      out.push(f);
    }
  }
  return out;
}

/**
 * Times tables as a game. The child chooses the table (or all of them).
 * Small facts are drawn as groups; a wrong choice brings a nudge built on
 * the fact next to it, never the answer. Missed facts come back at the end
 * of the round and at the start of the next one.
 */
export default function TimesGame({ lang, grade, onHome }: { lang: Lang; grade: Grade; onHome: () => void }) {
  const t = (k: Key) => tr(lang, k);
  const all = tablesFor(grade);
  const [tables, setTables] = useState<number[] | null>(null);
  const [queue, setQueue] = useState<Fact[]>([]);
  const [pos, setPos] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState<Fact[]>([]);
  const [repeated, setRepeated] = useState(false);
  const [done, setDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [note, setNote] = useState<{ text: string; good?: boolean; sticker?: string } | null>(null);
  const [mood, setMood] = useState<Mood>("happy");
  const seed = useRef(0);

  const fact = queue[pos];
  const choices = useMemo(() => (fact ? choicesFor(fact) : []), [fact]);

  function start(chosen: number[]) {
    setTables(chosen);
    setQueue(plan(grade, chosen));
    setPos(0);
    setFirstTry(0);
    setMissed([]);
    setRepeated(false);
    setFinished(false);
    setDone(false);
    setNote(null);
  }

  function nudge(f: Fact): string {
    const fill = (s: string) =>
      s.replace(/\{a\}/g, String(f.a)).replace(/\{b\}/g, String(f.b)).replace("{a1}", String(f.a - 1)).replace("{c}", String(f.a * f.b));
    if (f.op === "div") return fill(t("timesHintDiv"));
    return f.a === 1 ? t("timesHintOne") : fill(t("timesHintMul"));
  }

  function choose(n: number) {
    if (done || !fact) return;
    if (n === answerOf(fact)) {
      setDone(true);
      setMood("cheer");
      if (wrong === 0) setFirstTry((x) => x + 1);
      setNote({ text: vary(PRAISE[lang], seed.current++), good: true, sticker: vary(["🎉", "🌟", "👏", "💪", "🚀"], seed.current++) });
      return;
    }
    if (wrong === 0) setMissed((m) => [...m, fact]);
    setWrong(wrong + 1);
    setMood("think");
    setNote({ text: `${vary(GENTLE_WRONG[lang], seed.current++)}\n${nudge(fact)}` });
  }

  function next() {
    setWrong(0);
    setDone(false);
    setNote(null);
    setMood("happy");
    if (pos + 1 < queue.length) return setPos(pos + 1);
    // Missed facts come back once at the end of the round (spaced practice).
    if (!repeated && missed.length) {
      setRepeated(true);
      setQueue((q) => [...q, ...missed]);
      setPos(pos + 1);
      setNote({ text: t("timesAgain") });
      return;
    }
    saveMissed(missed);
    setFinished(true);
    markToday();
    award(Math.ceil(firstTry / 2) + 2);
  }

  if (!tables) {
    return (
      <div className="stack">
        <h1>✖️ {t("timesTitle")}</h1>
        <div className="mirodil-row">
          <Mirodil size={64} />
          <div className="bubble">{t("timesPick")}</div>
        </div>
        <div className="pick-grid">
          {all.map((n) => (
            <button key={n} className="pick" onClick={() => start([n])}>
              × {n}
            </button>
          ))}
          <button className="pick" onClick={() => start(all)}>
            {t("timesAll")}
          </button>
        </div>
        <button className="btn btn-light" onClick={onHome}>
          ← {t("home")}
        </button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="stack">
        <Celebrate />
        <div className="mirodil-row">
          <Mirodil size={80} mood="cheer" />
          <div className="bubble bubble-good">
            {t("drillDone").replace("{a}", String(firstTry)).replace("{n}", String(ROUND))}
          </div>
        </div>
        <button className="btn btn-primary btn-wide" onClick={() => start(tables)}>
          🔁 {t("again")}
        </button>
        <button className="btn btn-light" onClick={() => setTables(null)}>
          {t("timesPick")}
        </button>
        <button className="btn btn-light" onClick={onHome}>
          ← {t("home")}
        </button>
      </div>
    );
  }

  if (!fact) return null;
  const question = fact.op === "mul" ? `${fact.a} × ${fact.b} = ?` : `${fact.a * fact.b} : ${fact.b} = ?`;
  // Concrete → pictorial: small facts as groups of objects.
  const picture = fact.op === "mul" && fact.a * fact.b <= 30 && fact.a <= 10 && fact.b <= 12;

  return (
    <div className="stack">
      <h1>✖️ {t("timesTitle")}</h1>
      <div className="progress" aria-label={`${pos + 1} / ${queue.length}`}>
        {queue.map((_, i) => (
          <i key={i} className={i < pos ? "done" : i === pos ? "now" : ""} />
        ))}
      </div>
      <div className="task-card" style={{ textAlign: "center" }}>
        <div className="task-text">{question}</div>
        {picture && <Visual v={{ kind: "groups", groups: fact.a, each: fact.b, emoji: EMOJI[fact.b % EMOJI.length] }} lang={lang} />}
      </div>
      <div className="options">
        {choices.map((n) => (
          <button key={n} className="btn btn-blue" style={{ minHeight: 64, fontSize: 24 }} onClick={() => choose(n)} disabled={done}>
            {n}
          </button>
        ))}
      </div>
      {note && (
        <div className="mirodil-row">
          <Mirodil size={56} mood={mood} />
          <div className={`bubble${note.good ? " bubble-good" : ""}`} style={{ whiteSpace: "pre-line" }}>
            {note.text}
            {note.sticker && (
              <div>
                <span className="sticker-pop" aria-hidden>
                  {note.sticker}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {done && (
        <button className="btn btn-primary btn-wide" onClick={next}>
          {t("next")} →
        </button>
      )}
      <button className="btn btn-light" onClick={onHome}>
        ← {t("home")}
      </button>
    </div>
  );
}
