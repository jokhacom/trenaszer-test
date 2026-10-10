// Child profile and progress, kept in the browser for the prototype.
// The full version moves this to the database (accounts for child and parent).

import { TOPICS_BY_GRADE } from "./problems";
import type { Grade, Lang, Topic } from "./types";

export interface Profile {
  lang: Lang;
  avatar: string;
  grade: Grade;
}

export interface TopicStat {
  tries: number;
  /** Solved without reaching the "solve together" step. */
  selfSolved: number;
  /** Sum of the highest ladder level used (0 = no help, 1 = example, 2 = question, 3 = together). */
  helpSum: number;
}

type Progress = Partial<Record<Topic, TopicStat>>;

const PROFILE_KEY = "mirodil:profile";
const PROGRESS_KEY = "mirodil:progress";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage is full: the app still works, progress just isn't kept.
  }
}

export const loadProfile = () => read<Profile>(PROFILE_KEY);
export const saveProfile = (p: Profile) => write(PROFILE_KEY, p);

export function loadProgress(): Progress {
  return read<Progress>(PROGRESS_KEY) ?? {};
}

export function recordResult(topic: Topic, solved: boolean, maxLevel: number) {
  const all = loadProgress();
  const s = all[topic] ?? { tries: 0, selfSolved: 0, helpSum: 0 };
  s.tries += 1;
  if (solved && maxLevel < 3) s.selfSolved += 1;
  s.helpSum += maxLevel;
  all[topic] = s;
  write(PROGRESS_KEY, all);
}

/** Topics that need more practice: low self-solved share or a lot of help. */
export function weakTopics(grade: Grade): Topic[] {
  const all = loadProgress();
  return TOPICS_BY_GRADE[grade].filter((t) => {
    const s = all[t];
    if (!s || s.tries < 2) return false;
    return s.selfSolved / s.tries < 0.6 || s.helpSum / s.tries >= 2;
  });
}

/**
 * Topics for a 10-minute session: weak topics come back first (mastery),
 * the rest rotate so earlier topics keep returning (spiral review).
 */
export function sessionTopics(grade: Grade, n: number, r: () => number = Math.random): Topic[] {
  const weak = weakTopics(grade);
  const all = TOPICS_BY_GRADE[grade];
  const out: Topic[] = [];
  for (const t of weak) if (out.length < Math.ceil(n / 2)) out.push(t);
  const rest = [...all].sort(() => r() - 0.5);
  let i = 0;
  while (out.length < n) {
    out.push(rest[i % rest.length]);
    i++;
  }
  return out.sort(() => r() - 0.5);
}
