"use client";

import { useEffect, useState } from "react";
import { tr, type Key } from "@/lib/i18n";
import { loadSession, logoutToLanding, passwordAuth, syncNow } from "@/lib/cloud";
import type { Lang } from "@/lib/types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** A password field with a show/hide button. */
function PasswordInput({ lang, value, onChange, label, isNew }: { lang: Lang; value: string; onChange: (v: string) => void; label: string; isNew: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="pw-field">
      <input
        className="answer-input"
        type={shown ? "text" : "password"}
        autoComplete={isNew ? "new-password" : "current-password"}
        placeholder={label}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={72}
      />
      <button type="button" className="pw-eye" onClick={() => setShown((s) => !s)} aria-label={tr(lang, "pwShow")} aria-pressed={shown}>
        {shown ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

/**
 * Parent login: email and password (or a password-free link in the email).
 * Progress is then kept in the cloud and joined across phones.
 */
export default function CloudCard({
  lang,
  notice,
  onSynced,
  onLoggedIn,
  askPassword = false,
}: {
  lang: Lang;
  notice?: string | null;
  onSynced: () => void;
  /** Called after a login with a password. */
  onLoggedIn?: () => void;
  /** Open the "set a password" form (after a "forgot password" letter). */
  askPassword?: boolean;
}) {
  const t = (k: Key) => tr(lang, k);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [settingPassword, setSettingPassword] = useState(askPassword);
  const [account, setAccount] = useState<string | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);

  // A notice comes right after the login link: read the login again then.
  useEffect(() => {
    const s = loadSession();
    setAccount(s ? (s.email ?? "") : null);
    setMessage(notice ?? null);
  }, [notice]);

  useEffect(() => setSettingPassword(askPassword), [askPassword]);

  function failure(error: string | undefined, status: number) {
    if (status === 429 || error === "limit") return t("busy");
    if (error === "wrong_password") return t("pwWrong");
    if (error === "not_confirmed") return t("pwNotConfirmed");
    if (error === "exists") return t("pwExists");
    if (error === "weak_password") return t("pwHint");
    if (error === "bad_email") return t("cloudBadEmail");
    return `${t("error")} (${t("errorCode")}: ${error ?? status})`;
  }

  /** The email, checked; shows a message and returns null when it is not an address. */
  function checkedEmail(): string | null {
    const value = email.trim();
    if (EMAIL.test(value)) return value;
    setMessage(t("cloudBadEmail"));
    return null;
  }

  async function withPassword() {
    const value = checkedEmail();
    if (!value) return;
    if (signup && password.length < MIN_PASSWORD) return setMessage(t("pwHint"));
    setBusy(true);
    setMessage(null);
    const r = await passwordAuth(signup ? "signup" : "login", value, password);
    setBusy(false);
    if (!r.ok) return setMessage(failure(r.error, r.status));
    if (r.confirm) {
      setSignup(false);
      return setMessage(t("pwConfirm").replace("{email}", value));
    }
    setPassword("");
    setAccount(loadSession()?.email ?? value);
    onLoggedIn?.();
  }

  async function forgot() {
    const value = checkedEmail();
    if (!value) return;
    setBusy(true);
    setMessage(null);
    const r = await passwordAuth("reset", value);
    setBusy(false);
    setMessage(r.ok ? t("pwResetSent").replace("{email}", value) : failure(r.error, r.status));
  }

  async function sendLink() {
    const value = checkedEmail();
    if (!value) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/auth/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) return setMessage(t("cloudSent").replace("{email}", value));
    const data = ((await res?.json().catch(() => null)) ?? {}) as { error?: string; code?: string };
    setMessage(failure(data.code ?? data.error ?? (res ? undefined : "network"), res?.status ?? 0));
  }

  async function savePassword() {
    if (password.length < MIN_PASSWORD) return setMessage(t("pwHint"));
    setBusy(true);
    setMessage(null);
    const r = await passwordAuth("set", "", password);
    setBusy(false);
    if (!r.ok) return setMessage(failure(r.error, r.status));
    setPassword("");
    setSettingPassword(false);
    setMessage(t("pwSaved"));
  }

  async function sync() {
    setBusy(true);
    const r = await syncNow();
    setBusy(false);
    if (!r) {
      // The login ran out: log in again.
      if (!loadSession()) setAccount(null);
      return;
    }
    setAccount(r.email ?? "");
    onSynced();
  }

  if (account === undefined) return null;

  return (
    <section className="card stack">
      <h2 style={{ margin: 0 }}>{t("cloudTitle")}</h2>
      {message && (
        <div className="bubble" role="status">
          {message}
        </div>
      )}
      {account !== null ? (
        <>
          <p style={{ margin: 0 }}>
            ✅ {t("cloudOn")}
            {account && <span className="muted"> · {account}</span>}
          </p>
          <div className="row">
            <button className="btn btn-light" style={{ flex: 1 }} onClick={sync} disabled={busy} aria-label="Sync">
              🔄
            </button>
            <button
              className="btn btn-light"
              style={{ flex: 2 }}
              // Logging out goes back to the main page (www.mirodil.site).
              onClick={logoutToLanding}
            >
              {t("cloudLogout")}
            </button>
          </div>
          {settingPassword ? (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                savePassword();
              }}
            >
              <PasswordInput lang={lang} value={password} onChange={setPassword} label={t("pwNew")} isNew />
              <span className="muted" style={{ fontSize: 15 }}>
                {t("pwHint")}
              </span>
              <button className="btn btn-primary" type="submit" disabled={busy || !password}>
                {t("pwSave")}
              </button>
            </form>
          ) : (
            <button className="link-btn" style={{ margin: 0 }} onClick={() => setSettingPassword(true)}>
              {t("pwSet")}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            {t("cloudWhy")}
          </p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              withPassword();
            }}
          >
            <input
              className="answer-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t("cloudEmail")}
              aria-label={t("cloudEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordInput lang={lang} value={password} onChange={setPassword} label={t("pwPassword")} isNew={signup} />
            {signup && (
              <span className="muted" style={{ fontSize: 15 }}>
                {t("pwHint")}
              </span>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy || !email.trim() || !password}>
              {signup ? t("pwSignup") : t("pwLogin")}
            </button>
          </form>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="link-btn" style={{ margin: 0 }} onClick={() => setSignup((s) => !s)}>
              {signup ? t("pwToLogin") : t("pwToSignup")}
            </button>
            {!signup && (
              <button className="link-btn" style={{ margin: 0 }} onClick={forgot} disabled={busy}>
                {t("pwForgot")}
              </button>
            )}
          </div>
          <div className="pw-or">
            <span>{t("pwOr")}</span>
          </div>
          <button className="btn btn-light" onClick={sendLink} disabled={busy || !email.trim()}>
            📧 {t("pwLinkInstead")}
          </button>
        </>
      )}
    </section>
  );
}
