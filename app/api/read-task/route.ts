import { aiEnabled, AiError, readTask } from "@/lib/server/ai";
import { allow, clientIp } from "@/lib/server/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BASE64 = 7_000_000; // ~5 MB image; the browser shrinks photos before sending

export async function POST(req: Request) {
  if (!aiEnabled()) return Response.json({ error: "ai_off" }, { status: 503 });
  if (!allow(clientIp(req), "read", 30)) return Response.json({ error: "limit" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { image?: string } | null;
  const m = body?.image?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > MAX_BASE64) return Response.json({ error: "bad_image" }, { status: 400 });

  try {
    const out = await readTask(m[2], m[1] as "image/jpeg" | "image/png" | "image/webp");
    return Response.json(out);
  } catch (e) {
    console.error("read-task failed", e);
    const error = e instanceof AiError ? e.message : "ai_error";
    return Response.json({ error }, { status: error === "limit" ? 429 : 502 });
  }
}
