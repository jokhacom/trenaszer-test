import { AuthError, authEnabled, loginWithPassword, sendPasswordReset, setPassword, signUp } from "@/lib/server/auth";
import { allow, clientIp } from "@/lib/server/store";

export const runtime = "nodejs";

const MIN_PASSWORD = 8;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email and password: log in, sign up, ask for a reset letter, or set a new
 * password (logged in). Login with a password returns the session.
 */
export async function POST(req: Request) {
  if (!authEnabled()) return Response.json({ error: "auth_off" }, { status: 503 });
  // Password guessing is slowed down per address.
  if (!allow(clientIp(req), "password", 20)) return Response.json({ error: "limit" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { mode?: unknown; email?: unknown; password?: unknown } | null;
  const mode = body?.mode;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const back = new URL(req.url).origin;
  const needsEmail = mode === "login" || mode === "signup" || mode === "reset";
  if (needsEmail && (!EMAIL.test(email) || email.length > 200)) return Response.json({ error: "bad_email" }, { status: 400 });
  const newPassword = mode === "signup" || mode === "set";
  if (newPassword && (password.length < MIN_PASSWORD || password.length > 72)) return Response.json({ error: "weak_password" }, { status: 400 });
  if (mode === "login" && !password) return Response.json({ error: "wrong_password" }, { status: 400 });
  try {
    if (mode === "login") return Response.json({ session: await loginWithPassword(email, password) });
    if (mode === "signup") {
      const session = await signUp(email, password, back);
      return Response.json(session ? { session } : { confirm: true });
    }
    if (mode === "reset") {
      await sendPasswordReset(email, back);
      return Response.json({ ok: true });
    }
    if (mode === "set") {
      const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) return Response.json({ error: "logged_out" }, { status: 401 });
      await setPassword(token, password);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "bad_request" }, { status: 400 });
  } catch (e) {
    const code = e instanceof AuthError ? e.code : "auth";
    const status = e instanceof AuthError ? e.status : 502;
    return Response.json({ error: code === "email-limit" ? "limit" : code, code }, { status });
  }
}
