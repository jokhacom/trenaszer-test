"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { makeLesson, TOPIC_NAMES } from "@/lib/problems";
import { activeDays, loadPhotoStat, loadProgress, loadReading, strongTopics, weakTopics } from "@/lib/progress";
import type { Grade, Lang, Lesson, Topic } from "@/lib/types";
import Mirodil from "./Mirodil";

interface Report {
  strong: Topic[];
  weak: Topic[];
  self: number;
  helped: number;
  days: number;
  stories: number;
}

function build(grade: Grade): Report {
  const all = loadProgress();
  const photo = loadPhotoStat();
  const stats = [...Object.values(all), photo];
  const tries = stats.reduce((n, s) => n + (s?.tries ?? 0), 0);
  const self = stats.reduce((n, s) => n + (s?.selfSolved ?? 0), 0);
  return {
    strong: strongTopics(grade),
    weak: weakTopics(grade),
    self,
    helped: Math.max(tries - self, 0),
    days: activeDays(7),
    stories: loadReading().stories,
  };
}

/** A short report in plain words, not charts: what goes well, what is hard, what to practise. */
export default function ParentReport({
  lang,
  grade,
  onPractice,
  onHome,
}: {
  lang: Lang;
  grade: Grade;
  onPractice: (l: Lesson) => void;
  onHome: () => void;
}) {
  const t = (k: Parameters<typeof tr>[1]) => tr(lang, k);
  const [r, setR] = useState<Report | null>(null);
  useEffect(() => setR(build(grade)), [grade]);
  if (!r) return null;
  const empty = r.self + r.helped + r.stories === 0;
  const names = (ts: Topic[]) => ts.map((x) => TOPIC_NAMES[x][lang]).join(", ");

  return (
    <div className="stack">
      <h1>👨‍👩‍👧 {t("parentTitle")}</h1>

      {empty ? (
        <div className="mirodil-row">
          <Mirodil size={64} />
          <div className="bubble">{t("parentEmpty")}</div>
        </div>
      ) : (
        <>
          <section className="card stack">
            <h2>{t("parentActivity")}</h2>
            <ul className="report-list">
              <li>
                {t("parentDays")}: <b>{r.days} / 7</b>
              </li>
              <li>
                {t("parentSolved")}: <b>{r.self}</b>
              </li>
              <li>
                {t("parentWithHelp")}: <b>{r.helped}</b>
              </li>
              <li>
                {t("parentStories")}: <b>{r.stories}</b>
              </li>
            </ul>
          </section>

          {r.strong.length > 0 && (
            <section className="card stack">
              <h2>✅ {t("parentGood")}</h2>
              <p style={{ margin: 0 }}>{names(r.strong)}</p>
            </section>
          )}

          {r.weak.length > 0 && (
            <section className="card stack">
              <h2>🔁 {t("parentHard")}</h2>
              <p style={{ margin: 0 }}>{names(r.weak)}</p>
              <h3>{t("parentPractice")}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {t("parentPracticeNote")}
              </p>
              <div className="stack">
                {r.weak.slice(0, 3).map((x) => (
                  <button key={x} className="btn btn-blue btn-wide" style={{ justifyContent: "space-between" }} onClick={() => onPractice(makeLesson(x, lang, grade))}>
                    <span>{TOPIC_NAMES[x][lang]}</span>
                    <span aria-hidden>→</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="muted" style={{ margin: 0, fontSize: 15 }}>
        🔒 {t("parentPrivacy")}
      </p>
      <button className="btn btn-light" onClick={onHome}>
        ← {t("home")}
      </button>
    </div>
  );
}
