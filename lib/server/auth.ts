// Parent login by email (Supabase Auth): a one-time link goes to the email;
// the link brings the parent back to the site already logged in. Or email and
// password, for parents who prefer it (or when the letter is slow). The server
// checks the login token on every save, so a family sees only its own data.

import { anonKey, base } from "./storage";

export const authEnabled = () => Boolean(base() && anonKey());

const headers = (extra: Record<string, string> = {}) => ({ apikey: anonKey(), "Content-Type": "application/json", ...extra });

export class AuthError extends Error {
  constructor(readonly code: string, readonly status = 400) {
    super(code);
  }
}

/** Sends the login link. `back` is the page the link opens. */
export async function sendLoginLink(email: string, back: string): Promise<void> {
  const res = await fetch(`${base()}/auth/v1/otp?redirect_to=${encodeURIComponent(back)}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, create_user: true }),
  });
  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { error_code?: string; code?: string | number; msg?: string };
  console.error("login link failed", res.status, body);
  // Supabase's free email service sends only a few letters an hour.
  if (res.status === 429) throw new AuthError("email-limit", 429);
  throw new AuthError(String(body.error_code ?? `auth-${res.status}`), 502);
}

/** The logged-in user for a token, or null when the token is not valid. */
export async function userFromToken(token: string): Promise<{ id: string; email: string } | null> {
  const res = await fetch(`${base()}/auth/v1/user`, { headers: headers({ Authorization: `Bearer ${token}` }) });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string; email?: string };
  return user.id ? { id: user.id, email: user.email ?? "" } : null;
}

/**
 * When email login is set up, the AI is only for logged-in families: nobody
 * else can spend the site's AI tokens. Returns a 401 reply, or null to go on.
 * Without login set up (no Supabase) the site stays open as before.
 */
export async function requireLogin(req: Request, hasDatabase: boolean): Promise<Response | null> {
  if (!authEnabled() || !hasDatabase) return null;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = token ? await userFromToken(token).catch(() => null) : null;
  return user ? null : Response.json({ error: "logged_out" }, { status: 401 });
}

/** A fresh login token (they last an hour) from the long-lived refresh token. */
export async function refresh(refreshToken: string) {
  const res = await fetch(`${base()}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new AuthError("refresh-failed", 401);
  const s = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Math.floor(Date.now() / 1000) + s.expires_in };
}

export interface NewSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
}

type AuthReply = { access_token?: string; refresh_token?: string; expires_in?: number; user?: { email?: string }; email?: string; error_code?: string; code?: string | number; msg?: string };

function session(s: AuthReply, email: string): NewSession | null {
  if (!s.access_token || !s.refresh_token) return null;
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (s.expires_in ?? 3600), email: s.user?.email ?? email };
}

async function authFailure(res: Response, what: string): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as AuthReply;
  const code = String(body.error_code ?? body.code ?? "");
  console.error(`${what} failed`, res.status, code);
  if (res.status === 429) throw new AuthError("email-limit", 429);
  if (code === "invalid_credentials") throw new AuthError("wrong_password", 400);
  if (code === "email_not_confirmed") throw new AuthError("not_confirmed", 400);
  if (code === "weak_password") throw new AuthError("weak_password", 400);
  if (code === "user_already_exists" || code === "email_exists") throw new AuthError("exists", 400);
  throw new AuthError(code || `auth-${res.status}`, 502);
}

/** Logs in with email and password. */
export async function loginWithPassword(email: string, password: string): Promise<NewSession> {
  const res = await fetch(`${base()}/auth/v1/token?grant_type=password`, { method: "POST", headers: headers(), body: JSON.stringify({ email, password }) });
  if (!res.ok) return authFailure(res, "password login");
  const s = session((await res.json()) as AuthReply, email);
  if (!s) throw new AuthError("auth-session", 502);
  return s;
}

/**
 * A new account with a password. When Supabase asks to confirm the email
 * (the default), there is no session yet: a letter goes out first.
 */
export async function signUp(email: string, password: string, back: string): Promise<NewSession | null> {
  const res = await fetch(`${base()}/auth/v1/signup?redirect_to=${encodeURIComponent(back)}`, { method: "POST", headers: headers(), body: JSON.stringify({ email, password }) });
  if (!res.ok) return authFailure(res, "sign up");
  return session((await res.json()) as AuthReply, email);
}

/** Sends a letter whose link logs the parent in to choose a new password. */
export async function sendPasswordReset(email: string, back: string): Promise<void> {
  const res = await fetch(`${base()}/auth/v1/recover?redirect_to=${encodeURIComponent(back)}`, { method: "POST", headers: headers(), body: JSON.stringify({ email }) });
  if (!res.ok) await authFailure(res, "password reset");
}

/** Sets or changes the password of the logged-in parent. */
export async function setPassword(token: string, password: string): Promise<void> {
  const res = await fetch(`${base()}/auth/v1/user`, { method: "PUT", headers: headers({ Authorization: `Bearer ${token}` }), body: JSON.stringify({ password }) });
  if (res.status === 401 || res.status === 403) throw new AuthError("logged_out", 401);
  if (!res.ok) await authFailure(res, "set password");
}
