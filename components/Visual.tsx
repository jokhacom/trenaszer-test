// Pictures for the Singapore concrete → pictorial → abstract approach:
// ten frames, place-value blocks, groups, objects, bars and the column method.

import type { BlockRow, Lang, Visual as V } from "@/lib/types";
import BarDiagram from "./BarDiagram";

export default function Visual({ v, lang }: { v: V; lang: Lang }) {
  switch (v.kind) {
    case "tenframe":
      return <TenFrames a={v.a} b={v.b} move={v.move ?? 0} />;
    case "blocks":
      return (
        <div className="vis vis-blocks">
          {v.rows.map((r, i) => (
            <Blocks key={i} row={r} />
          ))}
        </div>
      );
    case "column":
      return <Column {...v} />;
    case "groups":
      return (
        <div className="vis vis-groups">
          {Array.from({ length: v.groups }, (_, g) => (
            <div key={g} className="group">
              {v.emoji.repeat(v.each)}
            </div>
          ))}
        </div>
      );
    case "objects":
      return <Objects emoji={v.emoji} counts={v.counts} crossed={v.crossed ?? 0} />;
    case "bar":
      return <BarDiagram spec={v.spec} lang={lang} />;
  }
}

function TenFrames({ a, b, move }: { a: number; b: number; move: number }) {
  // First frame: a dots plus the moved ones. Second frame: what is left of b.
  const first = Array.from({ length: 10 }, (_, i) => (i < a ? "dot" : i < a + move ? "dot moved" : ""));
  const second = Array.from({ length: 10 }, (_, i) => (i < b - move ? "dot two" : i < b ? "ghost" : ""));
  return (
    <div className="vis vis-frames" aria-label={`${a} + ${b}`}>
      {[first, second].map((cells, f) => (
        <div key={f} className="tenframe">
          {cells.map((c, i) => (
            <span key={i} className="cell">
              {c && <i className={c} />}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Blocks({ row }: { row: BlockRow }) {
  const crossT = row.crossTens ?? 0;
  const crossO = row.crossOnes ?? 0;
  const fromTen = row.fromTen ?? 0;
  const cubes = (from: number, to: number) =>
    Array.from({ length: Math.max(to - from, 0) }, (_, j) => {
      const i = from + j;
      const cls = `cube${i >= row.ones - fromTen ? " from-ten" : ""}${i >= row.ones - crossO ? " crossed" : ""}`;
      return <span key={i} className={cls} />;
    });
  return (
    <div className="block-row">
      {row.label && <b className="block-label">{row.label}</b>}
      <div className="block-items">
        {Array.from({ length: row.tens }, (_, i) => (
          <span key={`t${i}`} className={`rod${i >= row.tens - crossT ? " crossed" : ""}`} />
        ))}
        {row.ringTen ? (
          <>
            <span className="ones ring">{cubes(0, Math.min(10, row.ones))}</span>
            <span className="ones">{cubes(10, row.ones)}</span>
          </>
        ) : (
          <span className="ones">{cubes(0, row.ones)}</span>
        )}
      </div>
    </div>
  );
}

function Column({ a, b, op, result, carry }: { a: number; b: number; op: string; result?: string; carry?: string }) {
  const width = Math.max(`${a}`.length, `${b}`.length, result?.length ?? 0);
  const pad = (s: string) => s.padStart(width, " ").split("");
  const top = pad(`${a}`);
  return (
    <div className="vis vis-column" role="img" aria-label={`${a} ${op} ${b}`}>
      <div className="col-grid" style={{ gridTemplateColumns: `1.2em repeat(${width}, 1.2em)` }}>
        {/* carry / borrow line */}
        <span />
        {pad("").map((_, i) => (
          <span key={`c${i}`} className="col-carry">
            {carry && i === width - 2 ? carry : ""}
          </span>
        ))}
        <span />
        {top.map((d, i) => (
          <span key={`a${i}`} className={op === "−" && carry && i === width - 2 ? "struck" : ""}>
            {d.trim()}
          </span>
        ))}
        <span>{op}</span>
        {pad(`${b}`).map((d, i) => (
          <span key={`b${i}`}>{d.trim()}</span>
        ))}
        <span className="col-line" style={{ gridColumn: `1 / span ${width + 1}` }} />
        <span />
        {pad(result ?? "?".repeat(width)).map((d, i) => (
          <span key={`r${i}`} className={d === "?" ? "col-box" : ""}>
            {d === "?" ? "" : d.trim()}
          </span>
        ))}
      </div>
    </div>
  );
}

function Objects({ emoji, counts, crossed }: { emoji: string; counts: number[]; crossed: number }) {
  const total = counts.reduce((x, y) => x + y, 0);
  let k = 0;
  return (
    <div className="vis vis-objects">
      {counts.map((n, g) => (
        <div key={g} className="obj-group">
          {Array.from({ length: n }, (_, i) => {
            const idx = k++;
            return (
              <span key={i} className={idx >= total - crossed ? "obj crossed" : "obj"}>
                {emoji}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
