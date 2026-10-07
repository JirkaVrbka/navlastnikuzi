"use client";

// Small "↓ Teď" pill that scrolls the currently-running event into view. Shown
// in a day bar only when that day holds the running event. Scrolls to the row
// the timeline tagged with `targetId` (`itinerar-now` / `agenda-now`).
export function JumpNowButton({ targetId }: { targetId: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
      className="text-gold-bright border-gold min-h-11 shrink-0 rounded-full border bg-[var(--panel-2)] px-3 text-[11px] tracking-[0.06em]"
    >
      ↓ Teď
    </button>
  );
}
