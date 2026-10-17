// Reading texts aloud: the device's own voice when it has one for the
// language, otherwise the site's voice service (/api/tts). Browsers rarely
// ship an Uzbek voice, so Uzbek goes to the service.

import { authHeader } from "./cloud";
import type { Lang } from "./types";

const LOCALE: Record<Lang, string> = { uz: "uz", ru: "ru", en: "en" };

const SIGNS: Record<Lang, [RegExp, string][]> = {
  uz: [[/\+/g, " qo‘shuv "], [/[−-]/g, " ayiruv "], [/×/g, " ko‘paytiruv "], [/[:÷]/g, " bo‘luv "], [/=/g, " teng "], [/\?/g, " necha? "]],
  ru: [[/\+/g, " плюс "], [/[−-]/g, " минус "], [/×/g, " умножить на "], [/[:÷]/g, " разделить на "], [/=/g, " равно "], [/\?/g, " сколько? "]],
  en: [[/\+/g, " plus "], [/[−-]/g, " minus "], [/×/g, " times "], [/[:÷]/g, " divided by "], [/=/g, " equals "], [/\?/g, " what? "]],
};

function voiceFor(lang: Lang): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.toLowerCase().startsWith(LOCALE[lang])) ?? null;
}

// Whether the site's voice service is set up (asked once from /api/status).
let serverVoice = false;
let asked: Promise<void> | null = null;
const listeners = new Set<() => void>();

function askServer(): Promise<void> {
  asked ??= fetch("/api/status")
    .then((r) => r.json())
    .then((d: { tts?: boolean }) => {
      serverVoice = Boolean(d.tts);
      listeners.forEach((cb) => cb());
    })
    .catch(() => undefined);
  return asked;
}

export function canSpeak(lang: Lang): boolean {
  return serverVoice || voiceFor(lang) !== null;
}

/** Text as a person reads it: pictures and marks (✓ → 📧 🇺🇿) dropped, math signs (+ − × =) kept. */
export function forReading(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\p{So}\u{2190}-\u{21FF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{20E3}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turns "35 + 27 = ?" into words so the voice reads it like a teacher. */
export function forSpeech(text: string, lang: Lang): string {
  let s = text.replace(/…/g, ", ").replace(/[«»"“”]/g, "");
  // Signs between numbers only; dashes inside words stay as they are.
  for (const [re, word] of SIGNS[lang]) {
    s = s.replace(new RegExp(`(?<=[\\d\\s?])${re.source}(?=[\\s\\d?]|$)`, "g"), word);
  }
  return s.replace(/\s+/g, " ").trim();
}

let audio: HTMLAudioElement | null = null;
const clips = new Map<string, string>();

// Only the latest request plays: with the mouse moving fast, an older clip may arrive later.
let latest = 0;

async function speakOnServer(text: string, lang: Lang) {
  const ticket = ++latest;
  const id = `${lang}|${text}`;
  let url = clips.get(id);
  if (!url) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ text, lang }),
    }).catch(() => null);
    if (!res?.ok) return;
    url = URL.createObjectURL(await res.blob());
    clips.set(id, url);
  }
  if (ticket !== latest) return;
  stopSpeaking();
  latest = ticket;
  audio = new Audio(url);
  // Autoplay may be blocked until the first tap: then the 🔊 button works.
  audio.play().catch(() => undefined);
}

export function speak(text: string, lang: Lang): boolean {
  const voice = voiceFor(lang);
  if (!voice) {
    // The first time, ask whether the site's voice service is there.
    void askServer().then(() => {
      if (serverVoice) void speakOnServer(forSpeech(text, lang).slice(0, 1200), lang);
    });
    return serverVoice;
  }
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(forSpeech(text, lang));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  latest++;
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Whether anything is being read aloud now. */
export function isSpeaking(): boolean {
  if (audio && !audio.paused && !audio.ended) return true;
  return typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking;
}

/** Voices load asynchronously in some browsers; the voice service answer too. */
export function onVoicesReady(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(cb);
  void askServer();
  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  synth?.addEventListener("voiceschanged", cb);
  cb();
  return () => {
    listeners.delete(cb);
    synth?.removeEventListener("voiceschanged", cb);
  };
}
