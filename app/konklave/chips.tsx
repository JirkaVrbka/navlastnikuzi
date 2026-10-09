import { cn } from "cn";
import { initials } from "@/app/hraci/labels";

// Shared presentational atoms for the konkláve builder's slots AND the active
// view's read-only doprovod cards, so both features render identical chips.
// Match resources/konklave-build-1-columns.html.

// A player's initials inside a radial-gradient circle (gold ink on charcoal).
export function InitialsAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "font-display text-gold-bright flex shrink-0 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[radial-gradient(circle_at_35%_30%,#2c211a,#140f0c)] font-semibold shadow-[inset_0_0_10px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      {initials(name) || "?"}
    </span>
  );
}

// A door glyph tile standing in for a room.
export function RoomIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--gold)]/10",
        className,
      )}
    >
      🚪
    </span>
  );
}
