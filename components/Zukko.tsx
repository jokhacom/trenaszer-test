// Zukko — the helper character in a Chust doppi (black skullcap with four
// white pepper-shaped motifs) and an atlas-striped chapan.

export type Mood = "happy" | "think" | "cheer";

export default function Zukko({ size = 96, mood = "happy" }: { size?: number; mood?: Mood }) {
  return (
    <svg
      className="zukko-bob"
      width={size}
      height={size * (140 / 120)}
      viewBox="0 0 120 140"
      role="img"
      aria-label="Zukko"
      style={{ flex: "none" }}
    >
      <defs>
        <pattern id="z-atlas" width="16" height="24" patternUnits="userSpaceOnUse">
          <rect width="16" height="24" fill="#1e6bd6" />
          <path d="M4 0l4 6-2 0 2 6-4 6-4-6 2-6-2 0z" fill="#d81b6a" />
          <path d="M12 6l4 6-2 0 2 6-4 6-4-6 2-6-2 0z" fill="#f6b71a" />
        </pattern>
      </defs>
      {/* chapan */}
      <path d="M18 140 Q20 104 60 100 Q100 104 102 140 Z" fill="url(#z-atlas)" stroke="#2b2340" strokeWidth="3" />
      <path d="M50 101 L60 122 L70 101" fill="#fff7ea" stroke="#2b2340" strokeWidth="3" strokeLinejoin="round" />
      {/* ears */}
      <circle cx="26" cy="66" r="8" fill="#f0bf93" stroke="#2b2340" strokeWidth="3" />
      <circle cx="94" cy="66" r="8" fill="#f0bf93" stroke="#2b2340" strokeWidth="3" />
      {/* face */}
      <circle cx="60" cy="66" r="34" fill="#f6cfa6" stroke="#2b2340" strokeWidth="3" />
      {/* doppi */}
      <path d="M27 50 Q26 22 60 18 Q94 22 93 50 Z" fill="#1d1b26" stroke="#2b2340" strokeWidth="3" strokeLinejoin="round" />
      <path d="M28 49 L92 49" stroke="#fff" strokeWidth="2.5" strokeDasharray="4 3" />
      <path d="M41 44 q-6 -10 2 -18 q2 8 -2 18z" fill="#fff" />
      <path d="M79 44 q6 -10 -2 -18 q-2 8 2 18z" fill="#fff" />
      <path d="M55 44 q-3 -12 5 -20 q-1 10 -5 20z" fill="#fff" />
      <path d="M65 44 q3 -12 -5 -20 q1 10 5 20z" fill="#fff" opacity="0.85" />
      {/* cheeks */}
      <circle cx="40" cy="78" r="6" fill="#f3a2a8" opacity="0.7" />
      <circle cx="80" cy="78" r="6" fill="#f3a2a8" opacity="0.7" />
      {/* eyebrows */}
      {mood === "think" ? (
        <>
          <path d="M40 57 q6 -5 12 -1" stroke="#2b2340" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M68 55 q6 -3 12 2" stroke="#2b2340" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M40 57 q6 -4 12 0" stroke="#2b2340" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M68 57 q6 -4 12 0" stroke="#2b2340" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* eyes */}
      {mood === "cheer" ? (
        <>
          <path d="M40 68 q6 -7 12 0" stroke="#2b2340" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M68 68 q6 -7 12 0" stroke="#2b2340" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="46" cy={mood === "think" ? 65 : 67} rx="5" ry="6" fill="#2b2340" />
          <ellipse cx="74" cy={mood === "think" ? 65 : 67} rx="5" ry="6" fill="#2b2340" />
          <circle cx="48" cy={mood === "think" ? 63 : 65} r="1.8" fill="#fff" />
          <circle cx="76" cy={mood === "think" ? 63 : 65} r="1.8" fill="#fff" />
        </>
      )}
      {/* mouth */}
      {mood === "think" ? (
        <circle cx="62" cy="85" r="4" fill="#2b2340" />
      ) : mood === "cheer" ? (
        <path d="M46 80 Q60 98 74 80 Z" fill="#b8323f" stroke="#2b2340" strokeWidth="3" strokeLinejoin="round" />
      ) : (
        <path d="M48 81 Q60 92 72 81" stroke="#2b2340" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}
