import { authEnabled, userFromToken } from "@/lib/server/auth";
import { db, migrate } from "@/lib/server/db";
import { merge, SYNCED_KEYS, type Snapshot } from "@/lib/sync";

export const runtime = "nodejs";

async function who(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return token ? await userFromToken(token) : null;
}

/** Only known keys, and not too big. */
function clean(data: unknown): Snapshot | null {
  if (!data || typeof data !== "object") return null;
  const out: Snapshot = {};
  for (const k of SYNCED_KEYS) if (k in data) out[k] = (data as Snapshot)[k];
  // "My tasks" keeps up to 60 tasks with their text: room for that.
  return JSON.stringify(out).length <= 400_000 ? out : null;
}

/** The family's saved progress. */
export async function GET(req: Request) {
  const s = db();
  if (!authEnabled() || !s) return Response.json({ error: "sync_off" }, { status: 503 });
  const user = await who(req);
  if (!user) return Response.json({ error: "logged_out" }, { status: 401 });
  try {
    await migrate(s);
    const [row] = await s<{ data: Snapshot }[]>`select data from family_data where user_id = ${user.id}`;
    return Response.json({ email: user.email, data: row?.data ?? {} });
  } catch (e) {
    console.error("sync read failed", e);
    return Response.json({ error: "sync" }, { status: 502 });
  }
}

/** Saves the family's progress, joined with what is already saved (another phone may have saved meanwhile). */
export async function PUT(req: Request) {
  const s = db();
  if (!authEnabled() || !s) return Response.json({ error: "sync_off" }, { status: 503 });
  const user = await who(req);
  if (!user) return Response.json({ error: "logged_out" }, { status: 401 });
  const data = clean(((await req.json().catch(() => null)) as { data?: unknown } | null)?.data);
  if (!data) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    await migrate(s);
    const saved = await s.begin(async (tx) => {
      const [row] = await tx<{ data: Snapshot }[]>`select data from family_data where user_id = ${user.id} for update`;
      const joined = merge(data, row?.data ?? {});
      await tx`
        insert into family_data (user_id, email, data) values (${user.id}, ${user.email}, ${tx.json(joined as never)})
        on conflict (user_id) do update set data = excluded.data, email = excluded.email, updated_at = now()`;
      return joined;
    });
    return Response.json({ data: saved });
  } catch (e) {
    console.error("sync write failed", e);
    return Response.json({ error: "sync" }, { status: 502 });
  }
}
