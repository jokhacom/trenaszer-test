// The browser side of parent login and cloud saving. Progress always lives on
// the phone first; when a parent is logged in, it is copied to the cloud and
// joined with what other phones saved.

import { onSaved } from "./progress";
import { merge, SYNCED_KEYS, type Snapshot } from "./sync";

const SESSION_KEY = "mirodil:session";

interface Session {
  access_token: string;
  refresh_token: string;
  /** Seconds since 1970. */
  expires_at: number;
  email?: string;
}

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function set(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is off: the parent logs in again next time.
  }
}

export const loadSession = () => get<Session>(SESSION_KEY);
export const logout = () => set(SESSION_KEY, null);

export function snapshot(): Snapshot {
  const out: Snapshot = {};
  for (const k of SYNCED_KEYS) {
    const v = get<unknown>(k);
    if (v !== null) out[k] = v;
  }
  return out;
}

function restore(s: Snapshot) {
  for (const k of SYNCED_KEYS) if (s[k] !== undefined) set(k, s[k]);
}

/**
 * The login link brings the parent back with the login in the address
 * (#access_token=…). Saves it and cleans the address. Returns "error" when
 * the link was old or already used.
 */
export function takeLoginFromLink(): "ok" | "error" | null {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const clear = () => history.replaceState(null, "", window.location.pathname + window.location.search);
  if (hash.get("error") || hash.get("error_description")) {
    clear();
    return "error";
  }
  const access = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (!access || !refreshToken) return null;
  const expiresAt = Number(hash.get("expires_at")) || Math.floor(Date.now() / 1000) + (Number(hash.get("expires_in")) || 3600);
  set(SESSION_KEY, { access_token: access, refresh_token: refreshToken, expires_at: expiresAt });
  clear();
  return "ok";
}

/** A valid login token, refreshed when it is about to run out; null when logged out. */
async function token(): Promise<string | null> {
  const s = loadSession();
  if (!s) return null;
  if (s.expires_at - Date.now() / 1000 > 60) return s.access_token;
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  }).catch(() => null);
  if (!res) return null; // offline: try later
  if (res.status === 401) {
    logout();
    return null;
  }
  if (!res.ok) return null;
  const fresh = (await res.json()) as Omit<Session, "email">;
  set(SESSION_KEY, { ...s, ...fresh });
  return fresh.access_token;
}

/** The login header for requests to the AI (empty when not logged in). */
export async function authHeader(): Promise<Record<string, string>> {
  const t = await token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** The server says the login is gone: forget it and show the login screen. */
export function loginAgain() {
  logout();
  window.location.assign("/app");
}

async function call(method: "GET" | "PUT", body?: unknown): Promise<{ email?: string; data?: Snapshot } | null> {
  const t = await token();
  if (!t) return null;
  const res = await fetch("/api/sync", {
    method,
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  if (res?.status === 401) logout();
  return res?.ok ? ((await res.json()) as { email?: string; data?: Snapshot }) : null;
}

/** Joins this phone's progress with the cloud copy and saves the result on both. */
export async function syncNow(): Promise<{ email?: string } | null> {
  const remote = await call("GET");
  if (!remote) return null;
  const s = loadSession();
  if (s && remote.email) set(SESSION_KEY, { ...s, email: remote.email });
  const joined = merge(snapshot(), remote.data ?? {});
  restore(joined);
  const saved = await call("PUT", { data: joined });
  if (saved?.data) restore(saved.data);
  return { email: remote.email };
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** After each solved task, a copy goes to the cloud a few seconds later. */
export function startAutoSave(): () => void {
  return onSaved(() => {
    if (!loadSession()) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void call("PUT", { data: snapshot() }), 4000);
  });
}
