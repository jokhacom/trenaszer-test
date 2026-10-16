// A short readiness check before a new topic (Singapore syllabus: check the
// pre-requisite knowledge before new learning). When a child meets a topic
// for the first time and has not yet shown the topic it builds on, the
// lesson starts with one warm-up task on that earlier topic.

import type { Topic } from "./types";
import type { TopicStat } from "./progress";

/** What each topic builds on. */
export const BUILDS_ON: Partial<Record<Topic, Topic>> = {
  addCarry: "add10",
  subBorrow: "add10",
  wordTotal: "add10",
  wordRemain: "add10",
  wordMore: "wordTotal",
  wordLess: "wordRemain",
  div: "mult",
  mult2d: "mult",
};

/** The warm-up topic for this lesson plan, or null when the child is ready. */
export function warmUpFor(topics: Topic[], progress: Partial<Record<Topic, TopicStat>>): Topic | null {
  for (const t of topics) {
    const before = BUILDS_ON[t];
    if (!before || (progress[t]?.tries ?? 0) > 0) continue;
    // Shown when solved alone at least once.
    if ((progress[before]?.selfSolved ?? 0) === 0) return before;
  }
  return null;
}
