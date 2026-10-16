// Rewards that keep a child coming back: candies for work done, stickers to
// collect, levels (bronze, silver, gold) and avatars unlocked with them.
//
// Rules from motivation research (self-determination theory, Dweck's praise
// studies): reward the child's own work and persistence, not speed or
// guessing; never take anything away; no streaks that punish a missed day.
// Solving alone earns the most, but finishing with help still earns.

import type { Lang } from "./types";

const KEY = "mirodil:rewards";

export interface Rewards {
  candies: number;
  /** The last day a "first task today" bonus was given (YYYY-MM-DD). */
  bonusDay?: string;
}

export type Level = "none" | "bronze" | "silver" | "gold";

/** Candies needed for each level. */
export const LEVELS: { level: Exclude<Level, "none">; at: number; medal: string }[] = [
  { level: "bronze", at: 30, medal: "🥉" },
  { level: "silver", at: 100, medal: "🥈" },
  { level: "gold", at: 250, medal: "🥇" },
];

export const LEVEL_NAMES: Record<Exclude<Level, "none">, Record<Lang, string>> = {
  bronze: { uz: "Bronza", ru: "Бронза", en: "Bronze" },
  silver: { uz: "Kumush", ru: "Серебро", en: "Silver" },
  gold: { uz: "Oltin", ru: "Золото", en: "Gold" },
};

/** A new sticker every few candies, in this order (things from Uzbekistan come first). */
export const STICKERS = [
  "🍉", "🍞", "🫖", "🐪", "🍇", "🕌", "🪁", "🍑", "🐎", "🦚",
  "🌷", "🏔️", "🥟", "🐑", "🌸", "🎈", "⚽", "🚀", "🌈", "🦄",
  "🐬", "🦋", "🌻", "🎨", "🏀", "🐲", "🍰", "🎁", "🦁", "👑",
];
export const CANDIES_PER_STICKER = 8;

/** Extra avatars a child unlocks with a level. */
export const LEVEL_AVATARS: Record<Exclude<Level, "none">, string[]> = {
  bronze: ["🐲", "🦄"],
  silver: ["🦚", "🐬"],
  gold: ["👑", "🚀"],
};

function read(): Rewards {
  try {
    const raw = localStorage.getItem(KEY);
    const r = raw ? (JSON.parse(raw) as Rewards) : null;
    return { candies: Math.max(0, Math.floor(Number(r?.candies) || 0)), bonusDay: r?.bonusDay };
  } catch {
    return { candies: 0 };
  }
}

function write(r: Rewards) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    // Storage is off: candies are not kept, the app still works.
  }
}

export const loadRewards = read;

export function levelOf(candies: number): Level {
  let level: Level = "none";
  for (const l of LEVELS) if (candies >= l.at) level = l.level;
  return level;
}

/** The next level and how many candies are still needed, or null after gold. */
export function nextLevel(candies: number): { level: Exclude<Level, "none">; need: number } | null {
  const next = LEVELS.find((l) => candies < l.at);
  return next ? { level: next.level, need: next.at - candies } : null;
}

export function stickersFor(candies: number): string[] {
  return STICKERS.slice(0, Math.min(STICKERS.length, Math.floor(candies / CANDIES_PER_STICKER)));
}

export function avatarsFor(candies: number): string[] {
  const order: Exclude<Level, "none">[] = ["bronze", "silver", "gold"];
  const reached = order.slice(0, order.indexOf(levelOf(candies) as Exclude<Level, "none">) + 1);
  return levelOf(candies) === "none" ? [] : reached.flatMap((l) => LEVEL_AVATARS[l]);
}

/**
 * Candies for one task: 3 when solved alone, 2 with a hint, an example or a
 * question, 1 when solved together. Nothing for giving up, nothing is taken.
 */
export function candiesFor(solved: boolean, maxLevel: number): number {
  if (!solved) return 0;
  return maxLevel <= 0 ? 3 : maxLevel < 3 ? 2 : 1;
}

export interface Award {
  added: number;
  total: number;
  /** Stickers unlocked by this award. */
  stickers: string[];
  /** A level reached with this award. */
  level?: Exclude<Level, "none">;
  /** The first task of the day brought a bonus. */
  dayBonus: boolean;
}

const listeners = new Set<(a: Award) => void>();

/** The app shows a pop-up with the candies, a new sticker or a new level. */
export function onAward(fn: (a: Award) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function award(candies: number, today = new Date().toISOString().slice(0, 10)): Award | null {
  if (candies <= 0) return null;
  const before = read();
  // A small "welcome back" once a day: no penalty for missed days.
  const dayBonus = before.bonusDay !== today;
  const added = candies + (dayBonus ? 2 : 0);
  const after: Rewards = { candies: before.candies + added, bonusDay: today };
  write(after);
  const oldStickers = stickersFor(before.candies).length;
  const newLevel = levelOf(after.candies);
  const a: Award = {
    added,
    total: after.candies,
    stickers: stickersFor(after.candies).slice(oldStickers),
    level: newLevel !== levelOf(before.candies) && newLevel !== "none" ? newLevel : undefined,
    dayBonus,
  };
  listeners.forEach((fn) => fn(a));
  return a;
}
