// Reading text aloud on the server (Azure Speech), for voices the browser
// lacks: phones and computers almost never have an Uzbek voice, and a blind
// parent or a child who cannot read yet needs one. Free tier: 0.5 million
// characters a month.

import type { Lang } from "../types";

const VOICES: Record<Lang, string> = {
  uz: "uz-UZ-MadinaNeural",
  ru: "ru-RU-SvetlanaNeural",
  en: "en-US-JennyNeural",
};
const LOCALES: Record<Lang, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };

export const MAX_TTS_CHARS = 1200;

const key = () => process.env.AZURE_SPEECH_KEY ?? "";
const region = () => process.env.AZURE_SPEECH_REGION ?? "";

export const ttsEnabled = () => Boolean(key() && region());

const escapeXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);

// The same sentences come back often (hints, rules): keep the last few hundred.
const cache = new Map<string, ArrayBuffer>();
const CACHE_SIZE = 300;

/** MP3 audio of the text, read slowly and clearly. */
export async function synthesize(text: string, lang: Lang): Promise<ArrayBuffer> {
  const id = `${lang}|${text}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const ssml =
    `<speak version="1.0" xml:lang="${LOCALES[lang]}"><voice name="${VOICES[lang]}">` +
    `<prosody rate="-8%">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region()}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key(),
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "mirodil",
    },
    body: ssml,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`tts-${res.status}`);
  const audio = await res.arrayBuffer();
  cache.set(id, audio);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value as string);
  return audio;
}
