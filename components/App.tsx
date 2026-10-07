"use client";

import { useEffect, useState } from "react";
import { gradeLabel, LANG_NAMES, tr } from "@/lib/i18n";
import { makeLesson, TOPIC_NAMES } from "@/lib/problems";
import { loadProfile, recordResult, saveProfile, weakTopics, type Profile } from "@/lib/progress";
import { LANGS, type Grade, type Lang, type Lesson } from "@/lib/types";
import BarGame from "./BarGame";
import Ladder from "./Ladder";
import Listen from "./Listen";
import PhotoFlow from "./PhotoFlow";
import Session from "./Session";
import Mirodil from "./Mirodil";

type Screen = "welcome" | "home" | "photo" | "session" | "bar" | "practice";

const AVATARS = ["🦁", "🐯", "🐼", "🦊", "🐰", "🦉", "🐢", "🐱"];
const FLAGS: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [ready, setReady] = useState(false);
  const [ai, setAi] = useState(false);
  const [practice, setPractice] = useState<Lesson | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setProfile(p);
      setScreen("home");
    }
    setReady(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setAi(Boolean(d.ai)))
      .catch(() => setAi(false));
  }, []);

  useEffect(() => {
    if (profile) document.documentElement.lang = profile.lang;
  }, [profile]);

  // A new screen starts at the top, not where the previous one was scrolled.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  if (!ready) return null;

  const home = () => setScreen("home");

  return (
    <>
      <div className="atlas-band" />
      <main className="shell">
        {profile && screen !== "welcome" && (
          <header className="topbar">
            <button className="brand" onClick={home} aria-label={tr(profile.lang, "home")}>
              <Mirodil size={44} />
              <span>
                {tr(profile.lang, "appName")}
                <small>{tr(profile.lang, "tagline")}</small>
              </span>
            </button>
            <button className="chip" onClick={() => setScreen("welcome")} aria-label={tr(profile.lang, "settings")}>
              {profile.avatar} {gradeLabel(profile.lang, profile.grade)} · {FLAGS[profile.lang]}
            </button>
          </header>
        )}

        {screen === "welcome" && (
          <Welcome
            initial={profile}
            onStart={(p) => {
              saveProfile(p);
              setProfile(p);
              setScreen("home");
            }}
          />
        )}

        {profile && screen === "home" && (
          <Home
            profile={profile}
            onOpen={setScreen}
            onPractice={(lesson) => {
              setPractice(lesson);
              setScreen("practice");
            }}
          />
        )}

        {profile && screen === "photo" && <PhotoFlow lang={profile.lang} grade={profile.grade} ai={ai} onHome={home} />}
        {profile && screen === "session" && <Session lang={profile.lang} grade={profile.grade} onHome={home} />}
        {profile && screen === "bar" && (
          <div className="stack">
            <h1>🧩 {tr(profile.lang, "barTitle")}</h1>
            <BarGame lang={profile.lang} grade={profile.grade} />
            <button className="btn btn-light" onClick={home}>
              ← {tr(profile.lang, "home")}
            </button>
          </div>
        )}
        {profile && screen === "practice" && practice && (
          <div className="stack">
            <Ladder
              key={practice.id}
              lesson={practice}
              grade={profile.grade}
              onDone={(r) => practice.topic !== "other" && recordResult(practice.topic, r.solved, r.maxLevel)}
              onNext={() => practice.topic !== "other" && setPractice(makeLesson(practice.topic, profile.lang, profile.grade))}
            />
            <button className="btn btn-light" onClick={home}>
              ← {tr(profile.lang, "home")}
            </button>
          </div>
        )}
      </main>
    </>
  );
}

function Welcome({ initial, onStart }: { initial: Profile | null; onStart: (p: Profile) => void }) {
  const [lang, setLang] = useState<Lang>(initial?.lang ?? "uz");
  const [avatar, setAvatar] = useState(initial?.avatar ?? AVATARS[0]);
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? 2);
  const greeting = `${tr(lang, "hello")} ${tr(lang, "helloMore")}`;

  return (
    <div className="stack">
      <div className="mirodil-row" style={{ alignItems: "center" }}>
        <Mirodil size={120} mood="cheer" />
        <div className="bubble">
          <h1 style={{ marginBottom: 6 }}>{tr(lang, "hello")}</h1>
          {tr(lang, "helloMore")}
          <div style={{ marginTop: 8 }}>
            <Listen text={greeting} lang={lang} label />
          </div>
        </div>
      </div>

      <section className="card stack">
        <h2>{tr(lang, "chooseLang")}</h2>
        <div className="pick-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {LANGS.map((l) => (
            <button key={l} className={`pick${l === lang ? " on" : ""}`} onClick={() => setLang(l)} aria-pressed={l === lang}>
              {FLAGS[l]} {LANG_NAMES[l]}
            </button>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>{tr(lang, "chooseAvatar")}</h2>
        <div className="pick-grid">
          {AVATARS.map((a) => (
            <button key={a} className={`pick${a === avatar ? " on" : ""}`} onClick={() => setAvatar(a)} aria-pressed={a === avatar}>
              <span className="big">{a}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>{tr(lang, "chooseGrade")}</h2>
        <div className="pick-grid">
          {([1, 2, 3, 4] as Grade[]).map((g) => (
            <button key={g} className={`pick${g === grade ? " on" : ""}`} onClick={() => setGrade(g)} aria-pressed={g === grade}>
              {gradeLabel(lang, g)}
            </button>
          ))}
        </div>
      </section>

      <button className="btn btn-primary btn-wide" style={{ minHeight: 76, fontSize: 26 }} onClick={() => onStart({ lang, avatar, grade })}>
        {tr(lang, "start")} 🚀
      </button>
    </div>
  );
}

function Home({
  profile,
  onOpen,
  onPractice,
}: {
  profile: Profile;
  onOpen: (s: Screen) => void;
  onPractice: (l: Lesson) => void;
}) {
  const { lang, grade, avatar } = profile;
  const [weak, setWeak] = useState<ReturnType<typeof weakTopics>>([]);
  useEffect(() => setWeak(weakTopics(grade)), [grade]);

  return (
    <div className="stack">
      <div className="mirodil-row">
        <Mirodil size={80} />
        <div className="bubble">
          <b>
            {avatar} {tr(lang, "homeHello")}
          </b>
        </div>
      </div>

      <div className="tiles">
        <button className="tile tile-photo" onClick={() => onOpen("photo")}>
          <span className="emoji">📷</span>
          <div>
            <b>{tr(lang, "photoTitle")}</b>
            <span>{tr(lang, "photoDesc")}</span>
          </div>
        </button>
        <button className="tile tile-session" onClick={() => onOpen("session")}>
          <span className="emoji">⏱️</span>
          <div>
            <b>{tr(lang, "sessionTitle")}</b>
            <span>{tr(lang, "sessionDesc")}</span>
          </div>
        </button>
        <button className="tile tile-bar" onClick={() => onOpen("bar")}>
          <span className="emoji">🧩</span>
          <div>
            <b>{tr(lang, "barTitle")}</b>
            <span>{tr(lang, "barDesc")}</span>
          </div>
        </button>
        <div className="tile tile-read" aria-disabled>
          <span className="badge">{tr(lang, "soon")}</span>
          <span className="emoji">📖</span>
          <div>
            <b>{tr(lang, "readTitle")}</b>
          </div>
        </div>
      </div>

      {weak.length > 0 && (
        <section className="card stack">
          <h2>🔁 {tr(lang, "repeatTitle")}</h2>
          <div className="row">
            {weak.map((t) => (
              <button key={t} className="btn btn-light" onClick={() => onPractice(makeLesson(t, lang, grade))}>
                {TOPIC_NAMES[t][lang]}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
