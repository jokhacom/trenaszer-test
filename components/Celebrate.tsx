"use client";

import { useMemo } from "react";

const COLORS = ["#d81b6a", "#f6b71a", "#1e6bd6", "#2e9e5b", "#12a3a3"];

export default function Celebrate() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: `${(i * 97) % 100}%`,
        delay: `${(i % 9) * 0.08}s`,
        color: COLORS[i % COLORS.length],
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: p.left, animationDelay: p.delay, background: p.color }} />
      ))}
    </div>
  );
}
