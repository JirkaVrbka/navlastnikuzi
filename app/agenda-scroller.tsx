"use client";

import { useEffect, useRef } from "react";

// Bounded, internally-scrollable container for the home PERSONAL agenda. Unlike
// the full itinerary (which scrolls the window), this keeps the surrounding
// dashboard (greeting, konkláve card, nav links) fixed: only this container
// scrolls. It hosts its own sticky "↓ Teď" pill (styled like the itinerary's
// NowPill), and all scrolling — the pill click and the on-mount jump — is
// scoped to the container (never the window) via scrollTop math, not
// scrollIntoView. The jump targets the `anchorId` element at the past↔upcoming
// boundary; because scrollTop is clamped to the container's max scroll, when
// there are no upcoming events the anchor lands at/near the bottom, leaving the
// last past event visible with earlier ones scrolled up — the no-future case
// with no special handling.
export function AgendaScroller({
  anchorId,
  children,
}: {
  anchorId: string;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  // sticky pill (~48px) + day bar (~48px)
  const OFFSET = 96;

  function scrollToNow(smooth: boolean) {
    const c = containerRef.current;
    if (!c) return;
    const a = c.querySelector<HTMLElement>(`#${CSS.escape(anchorId)}`);
    if (!a) return;
    const top =
      c.scrollTop +
      (a.getBoundingClientRect().top - c.getBoundingClientRect().top) -
      OFFSET;
    c.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }

  useEffect(() => {
    // Jump to the anchor exactly once, on first mount. A double
    // requestAnimationFrame runs the jump after layout settles. Instant (no
    // smooth) so it reads as the initial position.
    if (ran.current) return;
    ran.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToNow(false);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative max-h-[70dvh] overflow-y-auto overscroll-contain"
    >
      <div className="pointer-events-none sticky top-0 z-30 flex h-12 items-center justify-center">
        <button
          type="button"
          onClick={() => scrollToNow(true)}
          className="text-gold-bright border-gold pointer-events-auto inline-flex min-h-11 items-center rounded-full border bg-[var(--panel-2)] px-4 text-[11px] tracking-[0.06em] shadow-[0_4px_18px_rgba(0,0,0,0.5)] backdrop-blur-[10px]"
        >
          ↓ Teď
        </button>
      </div>
      {children}
    </div>
  );
}
