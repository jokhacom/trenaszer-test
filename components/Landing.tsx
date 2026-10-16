"use client";

import { useEffect, useState } from "react";
import { L, type LKey } from "@/lib/landing";
import { LANGS, type Lang } from "@/lib/types";
import { LANG_NAMES } from "@/lib/i18n";
import Mirodil from "./Mirodil";

const FLAGS: Record<Lang, string> = { uz: "🇺🇿", ru: "🇷🇺", en: "🇬🇧" };
const LANG_KEY = "mirodil:landingLang";

/** A suzani rosette: the round embroidered flower of Uzbek suzani. */
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

/** The real lesson flow, shown on a phone: what the parent's child will see. */
function PhoneDemo({ t }: { t: (k: LKey) => string }) {
  return (
    <div className="lp-phone" aria-label={t("demoTitle")} role="img">
      <div className="lp-phone-bar">
        <Mirodil size={30} />
        <b>Mirodil</b>
      </div>
      <div className="lp-phone-screen">
        <div className="lp-msg lp-msg-bot">{t("bubble")}</div>
        <div className="lp-task">
          {t("demoTask")}
          <div className="lp-dots">
            {Array.from({ length: 13 }, (_, i) => (
              <i key={i} className={i < 8 ? "a" : "b"} style={{ animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        </div>
        <div className="lp-msg lp-msg-bot">{t("demoHint")}</div>
        <div className="lp-msg lp-msg-kid">{t("demoKid")}</div>
        <div className="lp-msg lp-msg-bot lp-msg-good">{t("demoPraise")} 🌟</div>
      </div>
    </div>
  );
}

/**
 * The landing page (www.mirodil.site), written for parents: calm and clear,
 * with bright accents and the national style (atlas band, suzani rosette).
 * The app itself lives at /app.
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

  // The headline's second half ("— tushunib yechadi") is the promise: highlight it.
  const [titleA, titleB] = t("heroTitle").split(" — ");

  const trust: LKey[] = ["trust1", "trust2", "trust3"];
  const steps: [string, LKey, LKey][] = [
    ["📧", "step1", "step1Text"],
    ["📷", "step2", "step2Text"],
    ["📈", "step3", "step3Text"],
  ];
  const features: [string, LKey, LKey, string][] = [
    ["🇸🇬", "f2", "f2t", "lp-t-pink"],
    ["👨‍👩‍👧", "f8", "f8t", "lp-t-blue"],
    ["🎮", "f3", "f3t", "lp-t-green"],
    ["🍬", "f4", "f4t", "lp-t-yellow"],
    ["📚", "f5", "f5t", "lp-t-turq"],
    ["🗣️", "f6", "f6t", "lp-t-purple"],
    ["⏱️", "f7", "f7t", "lp-t-pink"],
    ["☁️", "f9", "f9t", "lp-t-blue"],
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

  return (
    <div className="lp">
      <div className="atlas-band" />
      <header className="lp-top">
        <a className="lp-brand" href="/" aria-label="Mirodil">
          <Mirodil size={40} />
          <span>Mirodil</span>
        </a>
        <div className="lp-top-right">
          <nav className="lp-langs" aria-label="Til / Язык / Language">
            {LANGS.map((l) => (
              <button key={l} className={`lp-lang${l === lang ? " on" : ""}`} onClick={() => choose(l)} aria-pressed={l === lang} title={LANG_NAMES[l]}>
                {FLAGS[l]} <span className="lp-lang-name">{LANG_NAMES[l]}</span>
              </button>
            ))}
          </nav>
          <a className="lp-top-login" href="/app">
            {t("loginShort")}
          </a>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-text">
          <span className="lp-badge">{t("heroBadge")}</span>
          <h1>
            {titleA}
            {titleB && (
              <>
                {" — "}
                <span className="lp-mark">{titleB}</span>
              </>
            )}
          </h1>
          <p className="lp-lead">{t("heroText")}</p>
          <div className="lp-cta">
            <a className="lp-btn" href="/app">
              {t("login")} →
            </a>
            <span className="lp-note">🔒 {t("loginNote")}</span>
          </div>
          <ul className="lp-trust">
            {trust.map((k) => (
              <li key={k}>
                <i aria-hidden>✓</i> {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <div className="lp-hero-visual">
          <Rosette size={460} colors={["#f6b71a", "#d81b6a", "#1e6bd6"]} />
          <PhoneDemo t={t} />
          <span className="lp-mascot" aria-hidden>
            <Mirodil size={120} mood="cheer" />
          </span>
        </div>
      </section>

      <section className="lp-section">
        <h2>{t("compareTitle")}</h2>
        <div className="lp-compare" role="table" aria-label={t("compareTitle")}>
          <div className="lp-compare-row lp-compare-head" role="row">
            <span role="columnheader">{t("compareUsual")}</span>
            <span role="columnheader" className="lp-ours">
              <Mirodil size={28} /> {t("compareOurs")}
            </span>
          </div>
          {compare.map(([bad, good]) => (
            <div key={bad} className="lp-compare-row" role="row">
              <span role="cell" className="lp-bad">
                <i aria-hidden>✕</i> {t(bad)}
              </span>
              <span role="cell" className="lp-good">
                <i aria-hidden>✓</i> {t(good)}
              </span>
            </div>
          ))}
        </div>
        <p className="lp-small">{t("compareNote")}</p>
      </section>

      <section className="lp-section">
        <h2>{t("stepsTitle")}</h2>
        <ol className="lp-steps">
          {steps.map(([emoji, title, text], i) => (
            <li key={title} className="lp-step">
              <span className="lp-step-icon" aria-hidden>
                {emoji}
                <b>{i + 1}</b>
              </span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-section">
        <h2>{t("featuresTitle")}</h2>
        <div className="lp-features">
          {features.map(([emoji, title, text, tint]) => (
            <div key={title} className="lp-feature">
              <span className={`lp-icon ${tint}`} aria-hidden>
                {emoji}
              </span>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
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
        <a className="lp-btn lp-btn-light" href="/app">
          {t("login")} →
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
