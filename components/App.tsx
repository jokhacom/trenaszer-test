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
import CloudCard from "./CloudCard";
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
  // Logged in by a "forgot password" letter: ask for the new password.
  const [newPassword, setNewPassword] = useState(false);
  // The language of the login screen when there is no profile yet (a new phone or a new site address).
  const [loginLang, setLoginLang] = useState<Lang | undefined>(undefined);
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
    // Without a profile (a new phone, a new site address) the first screen is
    // the parent login, when it is set up: the family's tasks come back at once.
    // A short limit: without a profile the first screen waits for this answer.
    fetch("/api/status", { signal: AbortSignal.timeout(6000) })
      .then((r) => r.json())
      .then((d) => {
        setAi(Boolean(d.ai));
        setCloud(Boolean(d.cloud));
      })
      .catch(() => setAi(false))
      .finally(() => setReady(true));

    // A parent came back from the login link, or was logged in before:
    // join this phone's progress with the cloud copy.
    function checkLogin(first: boolean) {
      const login = takeLoginFromLink();
      if (login === "error") {
        setNotice(tr(loadProfile()?.lang ?? "ru", "cloudBadLink"));
        if (loadProfile()) setScreen("parents");
      } else if (login) afterLogin(login);
      else if (first && loadSession()) afterLogin(null);
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

  /**
   * After a login (link, password, or a "forgot password" link), or on start
   * when logged in before (`login` null): join this phone's progress with the
   * cloud copy.
   */
  function afterLogin(login: "ok" | "recovery" | null) {
    const lang = loadProfile()?.lang ?? "ru";
    syncNow().then((r) => {
      const synced = loadProfile();
      if (synced) setProfile(synced);
      setRewards(loadRewards());
      if (login === "recovery") {
        // Logged in by the reset letter: the parents' screen asks for the new password.
        setNewPassword(true);
        setNotice(tr(synced?.lang ?? lang, "pwChooseNew"));
        setScreen(synced ? "parents" : "welcome");
      } else if (login === "ok" && r) {
        // Straight to the child's home (or the first screen for a new family), with a clear "you are in".
        const email = loadSession()?.email;
        setNotice(`✅ ${tr(synced?.lang ?? lang, "cloudWelcome")}${email ? ` · ${email}` : ""}`);
        setScreen(synced ? "home" : "welcome");
      } else if (login === "ok") {
        // The login worked but the cloud did not answer: say so instead of staying silent.
        setNotice(`${tr(lang, "cloudSyncFailed")} (${tr(lang, "errorCode")}: sync)`);
        if (loadProfile()) setScreen("parents");
      }
    });
  }

  // The "you are in" note is for the first screen after login only.
  useEffect(() => {
    if (screen !== "home" && screen !== "welcome") setNotice((n) => (n?.startsWith("✅") ? null : n));
  }, [screen]);

  // A new screen starts at the top, not where the previous one was scrolled.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  if (!ready) return null;

  // With email login set up, the app opens only for a logged-in family.
  const mustLogin = cloud && !loadSession();

  const home = () => setScreen("home");
  // A child stuck on a task goes to a game that teaches the same idea another way.
  const openGame = (g: Game) => setScreen(g === "bar" ? "bar" : g);

  return (
    <>
      <div className="atlas-band" />
      <main className="shell">
        {profile && !mustLogin && screen !== "welcome" && (
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

        {mustLogin && (
          <div className="stack">
            <div className="row" style={{ justifyContent: "center" }}>
              {LANGS.map((l) => (
                <button
                  key={l}
                  className={`chip${(loginLang ?? profile?.lang ?? "uz") === l ? " chip-on" : ""}`}
                  onClick={() => setLoginLang(l)}
                  aria-pressed={(loginLang ?? profile?.lang ?? "uz") === l}
                >
                  {FLAGS[l]} {LANG_NAMES[l]}
                </button>
              ))}
            </div>
            <div className="mirodil-row">
              <Mirodil size={80} mood="happy" />
              <div className="bubble">
                <b>{tr(loginLang ?? profile?.lang ?? "uz", "loginFirstTitle")}</b>
              </div>
            </div>
            <CloudCard lang={loginLang ?? profile?.lang ?? "uz"} notice={notice} onSynced={() => undefined} onLoggedIn={() => afterLogin("ok")} />
          </div>
        )}

        {!mustLogin && notice && (screen === "home" || screen === "welcome") && (
          <div className="bubble bubble-good row" role="status" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
            <span>{notice}</span>
            <button className="link-btn" style={{ margin: 0 }} onClick={() => setNotice(null)} aria-label="OK">
              ✕
            </button>
          </div>
        )}

        {!mustLogin && screen === "welcome" && (
          <Welcome
            initial={profile}
            extraAvatars={avatarsFor(rewards.candies)}
            defaultLang={loginLang}
            onStart={(p) => {
              saveProfile(p);
              setProfile(p);
              setScreen("home");
            }}
          />
        )}

        {!mustLogin && profile && screen === "home" && (
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

        {!mustLogin && profile && screen === "times" && <TimesGame lang={profile.lang} grade={profile.grade} onHome={home} />}
        {!mustLogin && profile && screen === "bonds" && <BondsGame lang={profile.lang} grade={profile.grade} onHome={home} />}
        {!mustLogin && profile && screen === "rewards" && <RewardsAlbum lang={profile.lang} rewards={rewards} onHome={home} />}
        {!mustLogin && profile && screen === "photo" && <PhotoFlow lang={profile.lang} grade={profile.grade} ai={ai} onHome={home} onGame={openGame} />}
        {!mustLogin && profile && screen === "session" && <Session lang={profile.lang} grade={profile.grade} onHome={home} onGame={openGame} />}
        {!mustLogin && profile && screen === "read" && <ReadTogether lang={profile.lang} grade={profile.grade} onHome={home} />}
        {!mustLogin && profile && screen === "parents" && (
          <ParentReport
            lang={profile.lang}
            grade={profile.grade}
            cloud={cloud}
            notice={notice}
            askPassword={newPassword}
            onLoggedIn={() => afterLogin("ok")}
            onHome={home}
            onPractice={(lesson) => {
              setPractice(lesson);
              setScreen("practice");
            }}
          />
        )}
        {!mustLogin && profile && screen === "bar" && (
          <div className="stack">
            <h1>🧩 {tr(profile.lang, "barTitle")}</h1>
            <BarGame lang={profile.lang} grade={profile.grade} />
            <button className="btn btn-light" onClick={home}>
              ← {tr(profile.lang, "home")}
            </button>
          </div>
        )}
        {!mustLogin && profile && screen === "practice" && practice && (
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
  defaultLang,
  onStart,
}: {
  initial: Profile | null;
  /** Avatars unlocked with a level (bronze, silver, gold). */
  extraAvatars: string[];
  onStart: (p: Profile) => void;
  /** The language chosen before going to the login screen and back. */
  defaultLang?: Lang;
}) {
  const [lang, setLang] = useState<Lang>(initial?.lang ?? defaultLang ?? "uz");
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
