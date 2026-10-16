// Parent login by email (Supabase Auth): a one-time link goes to the email;
// the link brings the parent back to the site already logged in. The server
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
