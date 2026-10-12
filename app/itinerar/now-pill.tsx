"use client";

import { useEffect, useRef } from "react";

// Sticky "↓ Teď" pill pinned to the TOP of the itinerary / personal agenda,
// always visible and horizontally centered. Replaces the old per-day
// JumpNowButton. On click it smooth-scrolls back to the now-anchor (`targetId`,
// the invisible element at the past↔upcoming boundary); on mount it jumps there
// once (instant). The sticky container sits at z-30 — above the day bars (z-20,
// offset to top-12) — so it stays reachable while scrolling.
export function NowPill({ targetId }: { targetId: string }) {
  const ran = useRef(false);

  useEffect(() => {
    // Scroll to the anchor exactly once, on first mount. A double
    // requestAnimationFrame runs the jump after layout settles — including the
    // itinerary's post-`now` re-render, which moves the anchor's DOM position
    // one render after mount (when the live clock first resolves the past /
    // upcoming split). Instant (no smooth) so it reads as the initial position.
    if (ran.current) return;
    ran.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ block: "start" });
      });
    });
  }, [targetId]);

  return (
    <div className="pointer-events-none sticky top-0 z-30 flex h-12 items-center justify-center">
      <button
        type="button"
        onClick={() =>
          document
            .getElementById(targetId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        className="text-gold-bright border-gold pointer-events-auto inline-flex min-h-11 items-center rounded-full border bg-[var(--panel-2)] px-4 text-[11px] tracking-[0.06em] shadow-[0_4px_18px_rgba(0,0,0,0.5)] backdrop-blur-[10px]"
      >
        ↓ Teď
      </button>
    </div>
  );
}
