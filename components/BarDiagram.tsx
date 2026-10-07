// Singapore bar model: the task drawn as bars, with "?" on the unknown part.
// It never shows the answer — only the numbers from the task.

import { tr } from "@/lib/i18n";
import type { BarSpec, Lang } from "@/lib/types";

export default function BarDiagram({ spec, lang, kind = spec.kind }: { spec: BarSpec; lang: Lang; kind?: BarSpec["kind"] }) {
  const { a, b, nameA, nameB } = spec;
  const max = kind === "total" || kind === "more" ? a + b : a;
  const w = (x: number) => `${Math.max((x / max) * 100, 14)}%`;

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
            <div className="seg seg-a" style={{ width: w(a) }}>{a}</div>
            <div className="seg seg-b" style={{ width: w(b) }}>{b}</div>
          </div>
        </div>
        <div className="bar-line muted">
          <span />
          <div className="bar-track" style={{ height: "auto" }}>
            <div style={{ width: w(a), textAlign: "center" }}>{nameA}</div>
            <div style={{ width: w(b), textAlign: "center" }}>{nameB}</div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "remain") {
    const rest = Math.max(a - b, 1);
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
            <div className="seg seg-gone" style={{ width: w(b) }}>{b}</div>
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
            <div className="seg seg-a" style={{ width: w(a) }}>{a}</div>
          </div>
        </div>
        <div className="bar-line">
          <span />
          <div className="brace" style={{ width: w(a + b) }}>?</div>
        </div>
        <div className="bar-line">
          <span>{nameB}</span>
          <div className="bar-track">
            <div className="seg seg-q" style={{ width: w(a) }} />
            <div className="seg seg-b" style={{ width: w(b) }}>+{b}</div>
          </div>
        </div>
      </div>
    );
  }

  // less
  const rest = Math.max(a - b, 1);
  return (
    <div className="bars">
      <div className="bar-line">
        <span>{nameA}</span>
        <div className="bar-track">
          <div className="seg seg-a" style={{ width: w(a) }}>{a}</div>
        </div>
      </div>
      <div className="bar-line">
        <span>{nameB}</span>
        <div className="bar-track">
          <div className="seg seg-q" style={{ width: w(rest) }}>?</div>
          <div className="seg seg-gone" style={{ width: w(b) }}>−{b}</div>
        </div>
      </div>
    </div>
  );
}
