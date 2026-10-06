"use client";

// A removable pill (tag) used by the organizer and items pickers.
export function Pill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="bg-secondary text-foreground border-border flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm">
      {label}
      <button
        type="button"
        aria-label={`Odebrat ${label}`}
        className="text-muted-foreground hover:text-gold-bright"
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  );
}
