"use client";

import { tr } from "@/lib/i18n";
import {
  CANDIES_PER_STICKER,
  LEVEL_AVATARS,
  LEVEL_NAMES,
  LEVELS,
  levelOf,
  nextLevel,
  STICKERS,
  stickersFor,
  type Rewards,
} from "@/lib/rewards";
import type { Lang } from "@/lib/types";

/** Progress to the next level, shown on the home screen and in the album. */
export function LevelBar({ lang, rewards, onOpen }: { lang: Lang; rewards: Rewards; onOpen?: () => void }) {
  const level = levelOf(rewards.candies);
  const medal = LEVELS.find((l) => l.level === level)?.medal ?? "🍬";
  const next = nextLevel(rewards.candies);
  const from = LEVELS.filter((l) => rewards.candies >= l.at).pop()?.at ?? 0;
  const to = next ? rewards.candies + next.need : from;
  const share = next ? (rewards.candies - from) / Math.max(to - from, 1) : 1;
  const body = (
    <>
      <span className="medal">{medal}</span>
      <span className="stack" style={{ gap: 6, flex: 1, textAlign: "left" }}>
        <b>
          🍬 {rewards.candies} {tr(lang, "candies")}
          {level !== "none" && <span className="muted"> · {LEVEL_NAMES[level][lang]}</span>}
        </b>
        <span className="level-track" aria-hidden>
          <i style={{ width: `${Math.round(share * 100)}%` }} />
        </span>
        <small className="muted">
          {next ? tr(lang, "toNext").replace("{level}", LEVEL_NAMES[next.level][lang]).replace("{n}", String(next.need)) : tr(lang, "allLevels")}
        </small>
      </span>
    </>
  );
  return onOpen ? (
    <button className="card level-card" onClick={onOpen} aria-label={tr(lang, "rewardsTitle")}>
      {body}
    </button>
  ) : (
    <div className="card level-card">{body}</div>
  );
}

/** The album: levels with their avatars, and every sticker (locked ones as "?"). */
export default function RewardsAlbum({ lang, rewards, onHome }: { lang: Lang; rewards: Rewards; onHome: () => void }) {
  const have = stickersFor(rewards.candies).length;
  return (
    <div className="stack">
      <h1>🏆 {tr(lang, "rewardsTitle")}</h1>
      <LevelBar lang={lang} rewards={rewards} />
      <p className="muted" style={{ margin: 0 }}>
        {tr(lang, "howEarn")}
      </p>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>{tr(lang, "avatarsTitle")}</h2>
        {LEVELS.map((l) => {
          const open = rewards.candies >= l.at;
          return (
            <div key={l.level} className={`row level-row${open ? "" : " locked"}`}>
              <span className="medal">{l.medal}</span>
              <b style={{ flex: 1 }}>
                {LEVEL_NAMES[l.level][lang]} <span className="muted">· {l.at} 🍬</span>
              </b>
              <span style={{ fontSize: 30 }} title={open ? "" : tr(lang, "lockedAt").replace("{level}", LEVEL_NAMES[l.level][lang])}>
                {open ? LEVEL_AVATARS[l.level].join(" ") : "🔒"}
              </span>
            </div>
          );
        })}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>
          {tr(lang, "stickersTitle")} <span className="muted">· {have} / {STICKERS.length}</span>
        </h2>
        <small className="muted">{tr(lang, "stickerEvery").replace("{n}", String(CANDIES_PER_STICKER))}</small>
        <div className="sticker-grid">
          {STICKERS.map((s, i) => (
            <span key={i} className={`sticker${i < have ? "" : " locked"}`} aria-label={i < have ? s : "?"}>
              {i < have ? s : "?"}
            </span>
          ))}
        </div>
      </section>

      <button className="btn btn-light" onClick={onHome}>
        ← {tr(lang, "home")}
      </button>
    </div>
  );
}
