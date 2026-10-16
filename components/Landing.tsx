"use client";

import { useEffect, useState } from "react";
import { L, type LKey } from "@/lib/landing";
import { LANGS, type Lang } from "@/lib/types";
import { LANG_NAMES } from "@/lib/i18n";
import Mirodil from "./Mirodil";

const FLAGS: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };
const LANG_KEY = "mirodil:landingLang";

/** A suzani rosette: the round embroidered flower of Uzbek suzani, in bright colours. */
function Rosette({ size, colors }: { size: number; colors: [string, string, string] }) {
  const [outer, middle, inner] = colors;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className="lp-rosette">
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="50" cy="18" rx="11" ry="18" fill={outer} transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="24" fill={middle} />
      {Array.from({ length: 6 }, (_, i) => (
        <circle key={i} cx="50" cy="35" r="5" fill="#fff7ea" transform={`rotate(${i * 60} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="10" fill={inner} />
    </svg>
  );
}

/**
 * The landing page (www.mirodil.site): what Mirodil is, in the national style
 * — atlas stripes, suzani rosettes, the doppi — with bright colours. The app
 * itself lives at /app.
 */
export default function Landing() {
  const [lang, setLang] = useState<Lang>("uz");
  const t = (k: LKey) => L[k][lang];

  useEffect(() => {
    // The email login link comes back to the site's main address: hand it to the app.
    if (/access_token=|error_description=/.test(window.location.hash)) {
      window.location.replace(`/app${window.location.hash}`);
      return;
    }
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      const profile = JSON.parse(localStorage.getItem("mirodil:profile") ?? "null") as { lang?: Lang } | null;
      const l = saved ?? profile?.lang;
      if (l && LANGS.includes(l)) setLang(l);
    } catch {
      // Storage is off: Uzbek by default.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function choose(l: Lang) {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // Not kept: fine.
    }
  }

  const steps: [string, LKey, LKey][] = [
    ["📧", "step1", "step1Text"],
    ["📷", "step2", "step2Text"],
    ["📈", "step3", "step3Text"],
  ];
  const features: [string, LKey, LKey, string][] = [
    ["👨‍👩‍👧", "f8", "f8t", "lp-c-pink"],
    ["🇸🇬", "f2", "f2t", "lp-c-blue"],
    ["🎮", "f3", "f3t", "lp-c-green"],
    ["🍬", "f4", "f4t", "lp-c-yellow"],
    ["📚", "f5", "f5t", "lp-c-turq"],
    ["🗣️", "f6", "f6t", "lp-c-purple"],
    ["⏱️", "f7", "f7t", "lp-c-green"],
    ["☁️", "f9", "f9t", "lp-c-blue"],
  ];
  const compare: [LKey, LKey][] = [
    ["c1a", "c1b"],
    ["c2a", "c2b"],
    ["c3a", "c3b"],
    ["c4a", "c4b"],
    ["c5a", "c5b"],
    ["c6a", "c6b"],
  ];
  const faq: [LKey, LKey][] = [
    ["q1", "a1"],
    ["q2", "a2"],
    ["q3", "a3"],
    ["q4", "a4"],
    ["q5", "a5"],
    ["q6", "a6"],
    ["q7", "a7"],
  ];
  // One way in: the app asks for the email login first.
  const loginButton = (
    <a className="btn btn-pink lp-btn" href="/app">
      📧 {t("login")}
    </a>
  );

  return (
    <div className="lp">
      <div className="atlas-band" />
      <header className="lp-top">
        <a className="lp-brand" href="/" aria-label="Mirodil">
          <Mirodil size={44} />
          <span>Mirodil</span>
        </a>
        <nav className="lp-langs" aria-label="Til / Язык / Language">
          {LANGS.map((l) => (
            <button key={l} className={`chip${l === lang ? " chip-on" : ""}`} onClick={() => choose(l)} aria-pressed={l === lang} title={LANG_NAMES[l]}>
              {FLAGS[l]} <span className="lp-lang-name">{LANG_NAMES[l]}</span>
            </button>
          ))}
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-deco" aria-hidden>
          <Rosette size={120} colors={["#f6b71a", "#d81b6a", "#1e6bd6"]} />
          <Rosette size={80} colors={["#12a3a3", "#f6b71a", "#d81b6a"]} />
          <Rosette size={64} colors={["#d81b6a", "#1e6bd6", "#f6b71a"]} />
        </div>
        <div className="lp-hero-text">
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroText")}</p>
          <div className="lp-cta">{loginButton}</div>
          <p className="lp-note">🔒 {t("loginNote")}</p>
        </div>
        <div className="lp-hero-hero">
          <div className="bubble lp-hero-bubble">
            {t("bubble")} <span className="sticker-pop">🌟</span>
          </div>
          <Mirodil size={200} mood="cheer" />
        </div>
      </section>

      <section className="lp-section">
        <h2>{t("compareTitle")}</h2>
        <div className="lp-compare" role="table" aria-label={t("compareTitle")}>
          <div className="lp-compare-head" role="row">
            <span role="columnheader">🤖 {t("compareUsual")}</span>
            <span role="columnheader">
              <Mirodil size={28} /> {t("compareOurs")}
            </span>
          </div>
          {compare.map(([bad, good]) => (
            <div key={bad} className="lp-compare-row" role="row">
              <span role="cell" className="lp-bad">
                ✖ {t(bad)}
              </span>
              <span role="cell" className="lp-good">
                ✔ {t(good)}
              </span>
            </div>
          ))}
        </div>
        <p className="lp-note" style={{ textAlign: "center" }}>
          {t("compareNote")}
        </p>
      </section>

      <section className="lp-section">
        <h2>{t("stepsTitle")}</h2>
        <ol className="lp-steps">
          {steps.map(([emoji, title, text], i) => (
            <li key={title} className="lp-step">
              <span className="lp-step-num">{i + 1}</span>
              <span className="lp-step-emoji" aria-hidden>
                {emoji}
              </span>
              <b>{t(title)}</b>
              <span>{t(text)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-section lp-demo-wrap">
        <h2>{t("demoTitle")}</h2>
        <div className="lp-demo" aria-hidden>
          <div className="task-card">
            <div className="task-text long">{t("demoTask")}</div>
            <div className="lp-demo-dots">
              {Array.from({ length: 13 }, (_, i) => (
                <i key={i} className={i < 8 ? "a" : "b"} style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </div>
          <div className="mirodil-row">
            <Mirodil size={56} />
            <div className="bubble">{t("demoHint")}</div>
          </div>
          <div className="bubble bubble-kid">{t("demoKid")}</div>
          <div className="mirodil-row">
            <Mirodil size={56} mood="cheer" />
            <div className="bubble bubble-good">
              {t("demoPraise")} <span className="sticker-pop">🌟</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <h2>{t("featuresTitle")}</h2>
        <div className="lp-features">
          {features.map(([emoji, title, text, color]) => (
            <div key={title} className={`lp-feature ${color}`}>
              <span className="lp-feature-emoji" aria-hidden>
                {emoji}
              </span>
              <b>{t(title)}</b>
              <span>{t(text)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>{t("faqTitle")}</h2>
        <div className="lp-faq">
          {faq.map(([q, ans]) => (
            <details key={q}>
              <summary>{t(q)}</summary>
              <p>{t(ans)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="lp-final">
        <h2>{t("finalTitle")}</h2>
        <p>{t("finalText")}</p>
        <a className="btn btn-primary lp-btn" href="/app">
          📧 {t("login")}
        </a>
      </section>

      <footer className="lp-footer">
        <span>
          <b>{t("footer")}</b> · mirodil.site
        </span>
      </footer>
      <div className="atlas-band" />
    </div>
  );
}
