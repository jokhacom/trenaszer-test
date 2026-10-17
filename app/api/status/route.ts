import { aiEnabled } from "@/lib/server/ai";
import { authEnabled } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { ttsEnabled } from "@/lib/server/tts";

export const dynamic = "force-dynamic";

export function GET() {
  // cloud: parents can log in by email and progress is saved in the database.
  // tts: the server can read texts aloud (also in Uzbek).
  return Response.json({ ai: aiEnabled(), cloud: authEnabled() && Boolean(db()), tts: ttsEnabled() });
}
