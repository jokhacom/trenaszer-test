"use client";

import { useEffect, useState } from "react";
import { tr, type Key } from "@/lib/i18n";
import { loadSession, loginAgain, syncNow } from "@/lib/cloud";
import type { Lang } from "@/lib/types";

/** Parent login by email: progress is then kept in the cloud and joined across phones. */
export default function CloudCard({ lang, notice, onSynced }: { lang: Lang; notice?: string | null; onSynced: () => void }) {
  const t = (k: Key) => tr(lang, k);
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<string | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(notice ?? null);
  const [busy, setBusy] = useState(false);

  // A notice comes right after the login link: read the login again then.
  useEffect(() => {
    const s = loadSession();
    setAccount(s ? (s.email ?? "") : null);
    setMessage(notice ?? null);
  }, [notice]);

  async function send() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return setMessage(t("cloudBadEmail"));
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
    if (res?.status === 429 || data.error === "limit") return setMessage(t("busy"));
    setMessage(`${t("error")} (${t("errorCode")}: ${data.code ?? data.error ?? res?.status ?? "network"})`);
  }

  async function sync() {
    setBusy(true);
    const r = await syncNow();
    setBusy(false);
    if (!r) {
      // The login ran out: ask for a new link.
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
      {message && <div className="bubble">{message}</div>}
      {account !== null ? (
        <>
          <p style={{ margin: 0 }}>
            ✅ {t("cloudOn")}
            {account && <span className="muted"> · {account}</span>}
          </p>
          <div className="row">
            <button className="btn btn-light" style={{ flex: 1 }} onClick={sync} disabled={busy}>
              🔄
            </button>
            <button
              className="btn btn-light"
              style={{ flex: 2 }}
              // Login is required on this site: logging out goes back to the login screen.
              onClick={loginAgain}
            >
              {t("cloudLogout")}
            </button>
          </div>
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
              send();
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
            <button className="btn btn-primary" type="submit" disabled={busy || !email.trim()}>
              {t("cloudSend")}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
