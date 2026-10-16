import { AuthError, authEnabled, sendLoginLink } from "@/lib/server/auth";
import { allow, clientIp } from "@/lib/server/store";

export const runtime = "nodejs";

/** Sends a parent the login link. */
export async function POST(req: Request) {
  if (!authEnabled()) return Response.json({ error: "auth_off" }, { status: 503 });
  if (!allow(clientIp(req), "login", 5)) return Response.json({ error: "limit" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return Response.json({ error: "bad_email" }, { status: 400 });
  try {
    // The link opens the site the parent is on.
    await sendLoginLink(email, new URL(req.url).origin);
    return Response.json({ ok: true });
  } catch (e) {
    const code = e instanceof AuthError ? e.code : "auth";
    return Response.json({ error: code === "email-limit" ? "limit" : "auth", code }, { status: e instanceof AuthError ? e.status : 502 });
  }
}
