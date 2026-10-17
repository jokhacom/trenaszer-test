import { requireLogin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { allow, clientIp } from "@/lib/server/store";
import { MAX_TTS_CHARS, synthesize, ttsEnabled } from "@/lib/server/tts";
import { LANGS, type Lang } from "@/lib/types";

export const runtime = "nodejs";

const GUEST_CHARS = 400;

/** Reads a text aloud: MP3 audio. */
export async function POST(req: Request) {
  if (!ttsEnabled()) return Response.json({ error: "tts_off" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { text?: unknown; lang?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
  const lang = LANGS.includes(body?.lang as Lang) ? (body?.lang as Lang) : null;
  if (!text || !lang || text.length > MAX_TTS_CHARS) return Response.json({ error: "bad_request" }, { status: 400 });
  const ip = clientIp(req);
  const denied = await requireLogin(req, Boolean(db()));
  if (denied) {
    // Before login (the login screen itself) short texts are read too, so a
    // blind parent can log in; only a few, so nobody spends the voice quota.
    if (text.length > GUEST_CHARS || !allow(ip, "tts-guest", 120)) return denied;
  } else if (!allow(ip, "tts", 300)) return Response.json({ error: "limit" }, { status: 429 });
  try {
    const audio = await synthesize(text, lang);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
  } catch (e) {
    console.error("tts failed", e);
    return Response.json({ error: "tts_failed" }, { status: 502 });
  }
}
