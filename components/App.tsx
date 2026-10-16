"use client";

import { useEffect, useState } from "react";
import { gradeLabel, LANG_NAMES, tr } from "@/lib/i18n";
import { makeLesson, TOPIC_NAMES } from "@/lib/problems";
import { loadSession, startAutoSave, syncNow, takeLoginFromLink } from "@/lib/cloud";
import { loadProfile, recordResult, saveProfile, weakTopics, type Profile } from "@/lib/progress";
import { avatarsFor, loadRewards, onAward, type Rewards } from "@/lib/rewards";
import { LANGS, type Grade, type Lang, type Lesson } from "@/lib/types";
import BarGame from "./BarGame";
import BondsGame from "./BondsGame";
import TimesGame from "./TimesGame";
import type { Game } from "./Ladder";
import Ladder from "./Ladder";
import Listen from "./Listen";
import PhotoFlow from "./PhotoFlow";
import ParentReport from "./ParentReport";
import ReadTogether from "./ReadTogether";
import Session from "./Session";
import Mirodil from "./Mirodil";
import RewardPop from "./RewardPop";
import RewardsAlbum, { LevelBar } from "./RewardsAlbum";

type Screen = "welcome" | "home" | "photo" | "session" | "bar" | "practice" | "read" | "parents" | "rewards" | "bonds" | "times";

const AVATARS = ["🦁", "🐯", "🐼", "🦊", "🐰", "🦉", "🐢", "🐱"];
const FLAGS: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [ready, setReady] = useState(false);
  const [ai, setAi] = useState(false);
  const [practice, setPractice] = useState<Lesson | null>(null);
  const [cloud, setCloud] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Rewards>({ candies: 0 });

  // Candies on the top bar follow every award.
  useEffect(() => {
    setRewards(loadRewards());
    return onAward(() => setRewards(loadRewards()));
  }, []);

  useEffect(() => {
    const p = loadProfile();
    if (p) {
      setProfile(p);
      setScreen("home");
    }
    setReady(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        setAi(Boolean(d.ai));
        setCloud(Boolean(d.cloud));
      })
      .catch(() => setAi(false));

    // A parent came back from the login link, or was logged in before:
    // join this phone's progress with the cloud copy.
    function checkLogin(first: boolean) {
      const login = takeLoginFromLink();
      const lang = loadProfile()?.lang ?? "ru";
      if (login === "error") {
        setNotice(tr(lang, "cloudBadLink"));
        if (loadProfile()) setScreen("parents");
      } else if (login === "ok" || (first && loadSession())) {
        syncNow().then((r) => {
          const synced = loadProfile();
          if (synced) setProfile(synced);
          setRewards(loadRewards());
          if (login === "ok" && r) {
            setNotice(tr(synced?.lang ?? lang, "cloudWelcome"));
            setScreen(synced ? "parents" : "welcome");
          }
        });
      }
    }
    checkLogin(true);
    // The link may open in a tab where the site is already open.
    const onHash = () => checkLogin(false);
    window.addEventListener("hashchange", onHash);
    const stopAutoSave = startAutoSave();
    return () => {
      window.removeEventListener("hashchange", onHash);
      stopAutoSave();
    };
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
  // A child stuck on a task goes to a game that teaches the same idea another way.
  const openGame = (g: Game) => setScreen(g === "bar" ? "bar" : g);

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
            <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
              <button className="chip" onClick={() => setScreen("rewards")} aria-label={tr(profile.lang, "rewardsTitle")}>
                🍬 {rewards.candies}
              </button>
              <button className="chip" onClick={() => setScreen("welcome")} aria-label={tr(profile.lang, "settings")}>
                {profile.avatar} <span className="chip-grade">{gradeLabel(profile.lang, profile.grade)} ·</span> {FLAGS[profile.lang]}
              </button>
            </div>
          </header>
        )}

        {screen === "welcome" && (
          <Welcome
            initial={profile}
            extraAvatars={avatarsFor(rewards.candies)}
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
            rewards={rewards}
            onOpen={setScreen}
            onPractice={(lesson) => {
              setPractice(lesson);
              setScreen("practice");
            }}
          />
        )}

        {profile && screen === "times" && <TimesGame lang={profile.lang} grade={profile.grade} onHome={home} />}
        {profile && screen === "bonds" && <BondsGame lang={profile.lang} grade={profile.grade} onHome={home} />}
        {profile && screen === "rewards" && <RewardsAlbum lang={profile.lang} rewards={rewards} onHome={home} />}
        {profile && screen === "photo" && <PhotoFlow lang={profile.lang} grade={profile.grade} ai={ai} onHome={home} onGame={openGame} />}
        {profile && screen === "session" && <Session lang={profile.lang} grade={profile.grade} onHome={home} onGame={openGame} />}
        {profile && screen === "read" && <ReadTogether lang={profile.lang} grade={profile.grade} onHome={home} />}
        {profile && screen === "parents" && (
          <ParentReport
            lang={profile.lang}
            grade={profile.grade}
            cloud={cloud}
            notice={notice}
            onHome={home}
            onPractice={(lesson) => {
              setPractice(lesson);
              setScreen("practice");
            }}
          />
        )}
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
              onGame={openGame}
              onDone={(r) => practice.topic !== "other" && recordResult(practice.topic, r.solved, r.maxLevel)}
              onNext={() => practice.topic !== "other" && setPractice(makeLesson(practice.topic, profile.lang, profile.grade))}
            />
            <button className="btn btn-light" onClick={home}>
              ← {tr(profile.lang, "home")}
            </button>
          </div>
        )}
      </main>
      {profile && <RewardPop lang={profile.lang} />}
    </>
  );
}

function Welcome({
  initial,
  extraAvatars,
  onStart,
}: {
  initial: Profile | null;
  /** Avatars unlocked with a level (bronze, silver, gold). */
  extraAvatars: string[];
  onStart: (p: Profile) => void;
}) {
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
          {[...AVATARS, ...extraAvatars].map((a) => (
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
  rewards,
  onOpen,
  onPractice,
}: {
  profile: Profile;
  rewards: Rewards;
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

      <LevelBar lang={lang} rewards={rewards} onOpen={() => onOpen("rewards")} />

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
        <button className="tile tile-bonds" onClick={() => onOpen("bonds")}>
          <span className="emoji">🏠</span>
          <div>
            <b>{tr(lang, "bondsTitle")}</b>
            <span>{tr(lang, "bondsDesc")}</span>
          </div>
        </button>
        <button className="tile tile-times" onClick={() => onOpen("times")}>
          <span className="emoji">✖️</span>
          <div>
            <b>{tr(lang, "timesTitle")}</b>
            <span>{tr(lang, "timesDesc")}</span>
          </div>
        </button>
        <button className="tile tile-read" onClick={() => onOpen("read")}>
          <span className="emoji">📖</span>
          <div>
            <b>{tr(lang, "readTitle")}</b>
            <span>{tr(lang, "readDesc")}</span>
          </div>
        </button>
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

      <button className="link-btn" onClick={() => onOpen("parents")}>
        👨‍👩‍👧 {tr(lang, "parentTitle")}
      </button>
    </div>
  );
}
