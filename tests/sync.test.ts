import { describe, expect, it } from "vitest";
import { merge } from "@/lib/sync";

describe("merge", () => {
  it("keeps the work from both phones", () => {
    const local = {
      "mirodil:profile": { lang: "ru", avatar: "🦁", grade: 3 },
      "mirodil:progress": { add10: { tries: 5, selfSolved: 4, helpSum: 2 } },
      "mirodil:days": ["2026-10-10", "2026-10-11"],
      "mirodil:photo": { tries: 1, selfSolved: 1, helpSum: 0 },
    };
    const remote = {
      "mirodil:profile": { lang: "uz", avatar: "🐼", grade: 3 },
      "mirodil:progress": { add10: { tries: 3, selfSolved: 3, helpSum: 5 }, mult: { tries: 2, selfSolved: 0, helpSum: 6 } },
      "mirodil:days": ["2026-10-09", "2026-10-10"],
      "mirodil:reading": { stories: 2, firstTry: 3, questions: 6 },
    };
    expect(merge(local, remote)).toEqual({
      "mirodil:profile": { lang: "ru", avatar: "🦁", grade: 3 },
      "mirodil:progress": { add10: { tries: 5, selfSolved: 4, helpSum: 5 }, mult: { tries: 2, selfSolved: 0, helpSum: 6 } },
      "mirodil:reading": { stories: 2, firstTry: 3, questions: 6 },
      "mirodil:photo": { tries: 1, selfSolved: 1, helpSum: 0 },
      "mirodil:days": ["2026-10-09", "2026-10-10", "2026-10-11"],
    });
  });

  it("takes the cloud copy on a new phone", () => {
    const remote = { "mirodil:profile": { lang: "uz", avatar: "🐼", grade: 2 }, "mirodil:days": ["2026-10-01"] };
    expect(merge({}, remote)).toEqual(remote);
  });

  it("ignores broken values", () => {
    expect(merge({ "mirodil:days": ["bad", "2026-10-01"] }, { "mirodil:photo": { tries: "x" } })).toEqual({
      "mirodil:days": ["2026-10-01"],
      "mirodil:photo": { tries: 0 },
    });
  });
});
