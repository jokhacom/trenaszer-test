"use client";

// Voice mode: turned on once with the round 🔊 button, then whatever the
// mouse points at (or a finger taps, or the Tab key reaches) is read aloud.
// For blind or low-vision parents and for children who cannot read yet.
// The choice is kept on this device.

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { forReading, speak, stopSpeaking } from "@/lib/speech";
import { LANGS, type Lang } from "@/lib/types";

const KEY = "mirodil:voiceMode";
// Short pauses: reading starts when the mouse rests, not while it moves across.
const REST_MS = 350;
const MAX_CHARS = 400;

// The pieces a person reads one at a time.
const READABLE =
  "button, a, summary, label, input, select, textarea, h1, h2, h3, h4, p, li, .bubble, .task-text, .lp-msg, .lp-task, [role=button], [role=cell], [role=columnheader], [role=status]";

const pageLang = (): Lang => {
  const l = document.documentElement.lang as Lang;
  return LANGS.includes(l) ? l : "uz";
};

/** What to say for an element: its label, or the words a reader sees (no emoji, no password). */
function textOf(el: Element): string {
  let text = el.getAttribute("aria-label") ?? "";
  if (!text && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
    text = el.placeholder;
    if (el.type !== "password" && el.value) text = `${text}: ${el.value}`;
  } else if (!text && el instanceof HTMLSelectElement) {
    text = el.selectedOptions[0]?.text ?? "";
  } else if (!text) {
    text = (el as HTMLElement).innerText ?? el.textContent ?? "";
  }
  return forReading(text).slice(0, MAX_CHARS);
}

/** The element to read under the pointer: the nearest readable piece, or a bit of plain text. */
function readableAt(target: EventTarget | null): Element | null {
  if (!(target instanceof Element) || target.closest(".vm-toggle")) return null;
  const el = target.closest(READABLE);
  if (el) return el;
  const ownText = Array.from(target.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
  return ownText ? target : null;
}

function load(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export default function VoiceMode() {
  const [on, setOn] = useState(false);
  const [lang, setLang] = useState<Lang>("uz");

  useEffect(() => {
    setOn(load());
    setLang(pageLang());
    // The page changes its language when the family picks one.
    const watch = new MutationObserver(() => setLang(pageLang()));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    if (!on) return;
    let last: Element | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function read(el: Element | null) {
      if (!el || el === last) return;
      const text = textOf(el);
      if (!text) return;
      last?.classList.remove("vm-reading");
      last = el;
      el.classList.add("vm-reading");
      speak(text, pageLang());
    }

    const over = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (timer) clearTimeout(timer);
      const el = readableAt(e.target);
      timer = setTimeout(() => read(el), REST_MS);
    };
    // A finger has no "pointing": a tap reads (and still works as a tap).
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      last = null;
      read(readableAt(e.target));
    };
    // The Tab key: the reached button or field is read at once.
    const focus = (e: FocusEvent) => read(readableAt(e.target));

    document.addEventListener("pointerover", over);
    document.addEventListener("pointerdown", down);
    document.addEventListener("focusin", focus);
    return () => {
      if (timer) clearTimeout(timer);
      last?.classList.remove("vm-reading");
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("focusin", focus);
    };
  }, [on]);

  function toggle() {
    const next = !on;
    setOn(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      // Not kept: on for this visit only.
    }
    if (next) speak(tr(lang, "voiceModeOn"), lang);
    else {
      stopSpeaking();
      speak(tr(lang, "voiceModeOff"), lang);
    }
  }

  return (
    <button
      type="button"
      className={`vm-toggle${on ? " on" : ""}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={tr(lang, "voiceMode")}
      title={tr(lang, "voiceMode")}
    >
      <span aria-hidden>{on ? "🔊" : "🔈"}</span>
    </button>
  );
}
