"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { answerOf, choicesFor, makeBond, type Bond } from "@/lib/bonds";
import { GENTLE_WRONG, PRAISE, tr, type Key } from "@/lib/i18n";
import { vary } from "@/lib/ladder";
import { markToday } from "@/lib/progress";
import { award } from "@/lib/rewards";
import type { Grade, Lang } from "@/lib/types";
import { fmt } from "./BarDiagram";
import Celebrate from "./Celebrate";
import Listen from "./Listen";
import Mirodil, { type Mood } from "./Mirodil";
import Visual from "./Visual";

const ROUNDS = 8;

/** The number house: the whole on top, two parts below, one circle empty. */
function House({ bond, done }: { bond: Bond; done: boolean }) {
  const show = (k: Bond["hide"], n: number) => (bond.hide === k && !done ? "?" : fmt(n));
  const cls = (k: Bond["hide"]) => (bond.hide === k ? (done ? "bond-c found" : "bond-c empty") : "bond-c");
  return (
    <svg className="bond-house" viewBox="0 0 260 170" role="img" aria-label={`${show("whole", bond.whole)} = ${show("a", bond.a)} + ${show("b", bond.b)}`}>
      <line x1="130" y1="48" x2="62" y2="122" />
      <line x1="130" y1="48" x2="198" y2="122" />
      {(
        [
          ["whole", 130, 42, bond.whole],
          ["a", 62, 128, bond.a],
          ["b", 198, 128, bond.b],
        ] as const
      ).map(([k, x, y, n]) => (
        <g key={k} className={cls(k)}>
          <circle cx={x} cy={y} r="36" />
          <text x={x} y={y + 8} textAnchor="middle">
            {show(k, n)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * Number bonds game: eight houses, one empty circle each. Up to 20 the
 * parts are drawn as dots (concrete → pictorial); bigger numbers as a bar.
 * A wrong choice brings a nudge, never the number.
 */
export default function BondsGame({ lang, grade, onHome }: { lang: Lang; grade: Grade; onHome: () => void }) {
  const t = (k: Key) => tr(lang, k);
  const [round, setRound] = useState(0);
  const [bond, setBond] = useState<Bond>(() => makeBond(grade));
  const choices = useMemo(() => choicesFor(bond), [bond]);
  const [wrong, setWrong] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [done, setDone] = useState(false);
  const [finished, setFinished] = useState(false);
  const [note, setNote] = useState<{ text: string; good?: boolean; sticker?: string } | null>(null);
  const [mood, setMood] = useState<Mood>("happy");
  const seed = useRef(0);

  const ans = answerOf(bond);
  const small = bond.whole <= 20;

  function nudge(): string {
    if (bond.hide === "whole") return t("bondsHintWhole");
    if (small) return t("bondsHintDots");
    const known = bond.hide === "a" ? bond.b : bond.a;
    return t("bondsHintPart").replace("{a}", fmt(known)).replace("{whole}", fmt(bond.whole));
  }

  function choose(n: number) {
    if (done) return;
    if (n === ans) {
      setDone(true);
      setMood("cheer");
      if (wrong === 0) setFirstTry((x) => x + 1);
      setNote({ text: vary(PRAISE[lang], seed.current++), good: true, sticker: vary(["🎉", "🌟", "👏", "🏠", "💪"], seed.current++) });
      return;
    }
    setWrong(wrong + 1);
    setMood("think");
    setNote({ text: `${vary(GENTLE_WRONG[lang], seed.current++)}\n${nudge()}` });
  }

  function next() {
    if (round + 1 >= ROUNDS) {
      setFinished(true);
      markToday();
      // One candy per house found on the first try, two more for finishing.
      award(firstTry + 2);
      return;
    }
    setRound(round + 1);
    setBond(makeBond(grade));
    setWrong(0);
    setDone(false);
    setNote(null);
    setMood("happy");
  }

  if (finished) {
    return (
      <div className="stack">
        <Celebrate />
        <div className="mirodil-row">
          <Mirodil size={80} mood="cheer" />
          <div className="bubble bubble-good">
            {t("drillDone").replace("{a}", String(firstTry)).replace("{n}", String(ROUNDS))}
          </div>
        </div>
        <button
          className="btn btn-primary btn-wide"
          onClick={() => {
            setFinished(false);
            setFirstTry(0);
            setRound(-1);
            next();
          }}
        >
          🔁 {t("again")}
        </button>
        <button className="btn btn-light" onClick={onHome}>
          ← {t("home")}
        </button>
      </div>
    );
  }

  const known = bond.hide === "a" ? bond.b : bond.a;

  return (
    <div className="stack">
      <h1>🏠 {t("bondsTitle")}</h1>
      <div className="progress" aria-label={t("bondsRound").replace("{i}", String(round + 1)).replace("{n}", String(ROUNDS))}>
        {Array.from({ length: ROUNDS }, (_, i) => (
          <i key={i} className={i < round ? "done" : i === round ? "now" : ""} />
        ))}
      </div>
      <div className="task-card" style={{ textAlign: "center" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontWeight: 800 }}>
            {t("bondsRound").replace("{i}", String(round + 1)).replace("{n}", String(ROUNDS))}
          </span>
          <Listen text={`${t("bondsRule")} ${t("bondsAsk")}`} lang={lang} hideIfUnavailable />
        </div>
        <House bond={bond} done={done} />
        <div style={{ fontWeight: 800 }}>{t("bondsAsk")}</div>
        {round === 0 && !done && (
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 16 }}>
            {t("bondsRule")}
          </p>
        )}
        {/* Concrete → pictorial: up to 20, the whole as dots (known part filled, the rest empty to count). */}
        {small && bond.hide !== "whole" && (
          <div className="bond-dots" aria-hidden>
            {Array.from({ length: bond.whole }, (_, i) => (
              <i key={i} className={i < known ? "on" : ""} style={{ "--i": i } as CSSProperties} />
            ))}
          </div>
        )}
        {!small && (
          <Visual
            v={
              bond.hide === "whole"
                ? { kind: "bar", spec: { kind: "total", a: bond.a, b: bond.b, nameA: "", nameB: "" } }
                : { kind: "bar", spec: { kind: "part", a: bond.whole, b: known, nameA: "", nameB: "" } }
            }
            lang={lang}
          />
        )}
      </div>
      <div className="options">
        {choices.map((n) => (
          <button key={n} className="btn btn-blue" style={{ minHeight: 64, fontSize: 24 }} onClick={() => choose(n)} disabled={done}>
            {fmt(n)}
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
          {round + 1 >= ROUNDS ? "🏁" : t("next")} →
        </button>
      )}
      <button className="btn btn-light" onClick={onHome}>
        ← {t("home")}
      </button>
    </div>
  );
}
