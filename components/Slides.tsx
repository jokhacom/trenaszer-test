"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { speak } from "@/lib/speech";
import type { Frame, Lang } from "@/lib/types";
import Listen from "./Listen";
import Visual from "./Visual";

/** A solved example shown step by step, like a short presentation. */
export default function Slides({ frames, lang, autoSpeak }: { frames: Frame[]; lang: Lang; autoSpeak: boolean }) {
  const [i, setI] = useState(0);
  const f = frames[i];
  const last = i === frames.length - 1;

  useEffect(() => {
    if (autoSpeak) speak(f.text, lang);
  }, [i, autoSpeak, f.text, lang]);

  return (
    <div className="slides">
      <div style={{ fontWeight: 800 }}>{f.text}</div>
      {f.visual && <Visual v={f.visual} lang={lang} />}
      <div className="slide-nav">
        <button className="btn btn-light btn-small" onClick={() => setI(i - 1)} disabled={i === 0} aria-label={tr(lang, "back")}>
          ←
        </button>
        <div className="slide-dots" aria-label={`${i + 1} / ${frames.length}`}>
          {frames.map((_, j) => (
            <i key={j} className={j === i ? "on" : ""} />
          ))}
        </div>
        <Listen text={f.text} lang={lang} hideIfUnavailable />
        {last ? (
          <span style={{ width: 64 }} />
        ) : (
          <button className="btn btn-blue btn-small" onClick={() => setI(i + 1)}>
            {tr(lang, "next")} →
          </button>
        )}
      </div>
      {last && <p style={{ margin: "10px 0 0", fontWeight: 900, color: "var(--green)" }}>{tr(lang, "exampleNow")}</p>}
    </div>
  );
}
