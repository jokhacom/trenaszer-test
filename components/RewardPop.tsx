"use client";

import { useEffect, useRef, useState } from "react";
import { tr } from "@/lib/i18n";
import { LEVEL_AVATARS, LEVEL_NAMES, LEVELS, onAward, type Award } from "@/lib/rewards";
import type { Lang } from "@/lib/types";
import Celebrate from "./Celebrate";

/**
 * Shows what the child just earned: a short "+3 🍬" note, and a big card with
 * confetti for a new sticker or a new level.
 */
export default function RewardPop({ lang }: { lang: Lang }) {
  const [toast, setToast] = useState<Award | null>(null);
  const [big, setBig] = useState<Award | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      onAward((a) => {
        setToast(a);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 2600);
        if (a.stickers.length || a.level) setBig(a);
      }),
    [],
  );

  // The big card already showed the candies: no small note after it.
  const close = () => {
    setBig(null);
    setToast(null);
  };

  const medal = big?.level ? LEVELS.find((l) => l.level === big.level)?.medal : null;

  return (
    <>
      {toast && !big && (
        <div className="toast" role="status">
          <span className="toast-candy">🍬</span> +{toast.added}
          {toast.dayBonus && <small>{tr(lang, "dayBonus")}</small>}
        </div>
      )}
      {big && (
        <div className="pop-backdrop" role="dialog" aria-modal="true" onClick={close}>
          <Celebrate />
          <div className="pop-card" onClick={(e) => e.stopPropagation()}>
            {big.level && medal ? (
              <>
                <div className="sticker-big">{medal}</div>
                <h2 style={{ margin: 0 }}>
                  {tr(lang, "newLevel")} {LEVEL_NAMES[big.level][lang]}
                </h2>
                <p style={{ margin: 0 }}>
                  {tr(lang, "newAvatars")} <span style={{ fontSize: 32 }}>{LEVEL_AVATARS[big.level].join(" ")}</span>
                </p>
              </>
            ) : (
              <>
                <div className="sticker-big">{big.stickers[big.stickers.length - 1]}</div>
                <h2 style={{ margin: 0 }}>{tr(lang, "newSticker")}</h2>
              </>
            )}
            <p className="muted" style={{ margin: 0 }}>
              🍬 {big.total} {tr(lang, "candies")}
            </p>
            <button className="btn btn-primary btn-wide" onClick={close} autoFocus>
              {tr(lang, "hooray")} 🎉
            </button>
          </div>
        </div>
      )}
    </>
  );
}
