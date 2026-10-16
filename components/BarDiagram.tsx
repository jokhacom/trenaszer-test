// Singapore bar model: the task drawn as bars, with "?" on the unknown part.
// It never shows the answer — only the numbers from the task.

import { tr } from "@/lib/i18n";
import type { BarSpec, Lang } from "@/lib/types";

/** 6709 → "6 709", as in school textbooks. */
export function fmt(n: number): string {
  return Math.abs(n) >= 1000 ? n.toLocaleString("ru-RU").replace(/\s/g, "\u00a0") : String(n);
}

export default function BarDiagram({ spec, lang, kind = spec.kind }: { spec: BarSpec; lang: Lang; kind?: BarSpec["kind"] }) {
  const { a: a0, b: b0, nameA, nameB } = spec;
  const max = kind === "total" || kind === "more" ? a0 + b0 : a0;
  const w = (x: number) => `${Math.max((x / max) * 100, 14)}%`;
  const a = fmt(a0);
  const b = fmt(b0);

  if (kind === "times" || kind === "share") {
    // b equal pieces: "a, b times" (whole unknown) or "a split into b parts" (one part unknown).
    const n = Math.min(Math.max(b0, 2), 10);
    const piece = `${100 / n}%`;
    return (
      <div className="bars">
        <div className="bar-line">
          <span>{kind === "share" ? nameA : ""}</span>
          <div className="brace">{kind === "times" ? `? — ${tr(lang, "whole")}` : a}</div>
        </div>
        <div className="bar-line">
          <span>{kind === "times" ? nameA : ""}</span>
          <div className="bar-track">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className={`seg ${kind === "share" && i === 0 ? "seg-q" : "seg-a"} seg-piece`} style={{ width: piece }}>
                {kind === "times" ? (i === 0 ? a : "") : i === 0 ? "?" : ""}
              </div>
            ))}
          </div>
        </div>
        <div className="bar-line muted">
          <span />
          <div style={{ textAlign: "center" }}>
            {kind === "times" ? `${a} × ${b}` : `${a} : ${b}`} {nameB && `· ${nameB}`}
          </div>
        </div>
      </div>
    );
  }

  if (kind === "total") {
    return (
      <div className="bars">
        <div className="bar-line">
          <span />
          <div className="brace">? — {tr(lang, "whole")}</div>
        </div>
        <div className="bar-line">
          <span />
          <div className="bar-track">
            <div className="seg seg-a" style={{ width: w(a0) }}>{a}</div>
            <div className="seg seg-b" style={{ width: w(b0) }}>{b}</div>
          </div>
        </div>
        <div className="bar-line muted">
          <span />
          <div className="bar-track" style={{ height: "auto" }}>
            <div style={{ width: w(a0), textAlign: "center" }}>{nameA}</div>
            <div style={{ width: w(b0), textAlign: "center" }}>{nameB}</div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "remain") {
    const rest = Math.max(a0 - b0, 1);
    return (
      <div className="bars">
        <div className="bar-line">
          <span>{nameA}</span>
          <div className="brace">{a}</div>
        </div>
        <div className="bar-line">
          <span />
          <div className="bar-track">
            <div className="seg seg-q" style={{ width: w(rest) }}>? {tr(lang, "left")}</div>
            <div className="seg seg-gone" style={{ width: w(b0) }}>{b}</div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "more") {
    return (
      <div className="bars">
        <div className="bar-line">
          <span>{nameA}</span>
          <div className="bar-track">
            <div className="seg seg-a" style={{ width: w(a0) }}>{a}</div>
          </div>
        </div>
        <div className="bar-line">
          <span />
          <div className="brace" style={{ width: w(a0 + b0) }}>?</div>
        </div>
        <div className="bar-line">
          <span>{nameB}</span>
          <div className="bar-track">
            <div className="seg seg-q" style={{ width: w(a0) }} />
            <div className="seg seg-b" style={{ width: w(b0) }}>+{b}</div>
          </div>
        </div>
      </div>
    );
  }

  // less
  const rest = Math.max(a0 - b0, 1);
  return (
    <div className="bars">
      <div className="bar-line">
        <span>{nameA}</span>
        <div className="bar-track">
          <div className="seg seg-a" style={{ width: w(a0) }}>{a}</div>
        </div>
      </div>
      <div className="bar-line">
        <span>{nameB}</span>
        <div className="bar-track">
          <div className="seg seg-q" style={{ width: w(rest) }}>?</div>
          <div className="seg seg-gone" style={{ width: w(b0) }}>−{b}</div>
        </div>
      </div>
    </div>
  );
}
