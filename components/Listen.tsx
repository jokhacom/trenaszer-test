"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { canSpeak, onVoicesReady, speak } from "@/lib/speech";
import type { Lang } from "@/lib/types";

export function useVoice(lang: Lang): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => onVoicesReady(() => setOk(canSpeak(lang))), [lang]);
  return ok;
}

/** 🔊 button next to any text. Disabled with an explanation when there is no voice. */
export default function Listen({
  text,
  lang,
  label = false,
  hideIfUnavailable = false,
}: {
  text: string;
  lang: Lang;
  label?: boolean;
  hideIfUnavailable?: boolean;
}) {
  const ok = useVoice(lang);
  if (!ok && hideIfUnavailable) return null;
  return (
    <button
      type="button"
      className="listen"
      onClick={() => speak(text, lang)}
      disabled={!ok}
      title={ok ? tr(lang, "listen") : tr(lang, "noVoice")}
      aria-label={tr(lang, "listen")}
    >
      🔊{label && <span style={{ fontSize: 16 }}>{tr(lang, "listen")}</span>}
    </button>
  );
}
