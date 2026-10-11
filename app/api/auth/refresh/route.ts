import { authEnabled, refresh } from "@/lib/server/auth";

export const runtime = "nodejs";

/** A new login token for a parent who logged in before. */
export async function POST(req: Request) {
  if (!authEnabled()) return Response.json({ error: "auth_off" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { refresh_token?: unknown } | null;
  if (typeof body?.refresh_token !== "string" || !body.refresh_token) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    return Response.json(await refresh(body.refresh_token));
  } catch {
    return Response.json({ error: "logged_out" }, { status: 401 });
  }
}
