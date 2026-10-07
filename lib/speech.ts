// Reading tasks aloud with the browser's built-in voices.
// Browsers rarely ship an Uzbek voice; until a voice service (e.g. Azure) is
// connected, Uzbek is read only where the device has a uz-UZ voice.

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

export function canSpeak(lang: Lang): boolean {
  return voiceFor(lang) !== null;
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

export function speak(text: string, lang: Lang): boolean {
  const voice = voiceFor(lang);
  if (!voice) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(forSpeech(text, lang));
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Voices load asynchronously in some browsers. */
export function onVoicesReady(cb: () => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return () => {};
  const synth = window.speechSynthesis;
  synth.addEventListener("voiceschanged", cb);
  cb();
  return () => synth.removeEventListener("voiceschanged", cb);
}
