import { describe, expect, it } from "vitest";
import { STORIES } from "../lib/stories";
import { LANGS } from "../lib/types";

describe("read-together stories", () => {
  for (const story of STORIES) {
    it(`${story.id}: same shape in all three languages, answers point into the text`, () => {
      const base = story.text.ru;
      for (const lang of LANGS) {
        const t = story.text[lang];
        expect(t.title.trim()).not.toBe("");
        expect(t.sentences.length).toBe(base.sentences.length);
        expect(t.questions.length).toBe(base.questions.length);
        t.questions.forEach((q, i) => {
          expect(q.options.length).toBeGreaterThanOrEqual(2);
          expect(q.correct).toBe(base.questions[i].correct);
          expect(q.evidence).toBe(base.questions[i].evidence);
          expect(q.correct).toBeLessThan(q.options.length);
          expect(q.evidence).toBeLessThan(t.sentences.length);
        });
      }
    });
  }
});
