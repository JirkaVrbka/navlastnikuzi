"use client";

import { useState } from "react";
import type { ExistingType } from "@/lib/db/itinerary";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Searchable SINGLE-select free-text event type: type to filter types already
// used on other events; pick one, or add a new one as free text. Mirrors the
// BlockPicker's dropdown look and behavior, but commits a single `type` string.
// Submits one hidden `type` input (the committed value, else the pending text).
// When an EXISTING type is PICKED (suggestion click, or an Enter that lands on a
// matching suggestion), its representative color — when it has one — is reported
// via onPickColor so the form can prefill the event's color. Free-text / new
// types never touch the color, and typing alone never fires onPickColor.
export function TypePicker({
  types,
  value,
  onChange,
  onPickColor,
}: {
  types: ExistingType[];
  value: string;
  onChange: (next: string) => void;
  onPickColor?: (color: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const q = query.trim();
  const ql = q.toLowerCase();

  // Suggestions: all known types matching the query, excluding the current value.
  const filtered = types.filter(
    (t) =>
      t.type.toLowerCase() !== value.toLowerCase() &&
      (ql === "" || t.type.toLowerCase().includes(ql)),
  );

  const exact = types.some((t) => t.type.toLowerCase() === ql);
  const showFreeText = q !== "" && !exact;

  // Pick an EXISTING type: set it AND report its color (when it has one).
  function selectExisting(t: ExistingType) {
    onChange(t.type.trim());
    if (t.color !== null) onPickColor?.(t.color);
    setQuery("");
    setOpen(false);
  }

  // Commit a free-text (new) type: set it, never touch the color.
  function selectFreeText(next: string) {
    onChange(next.trim());
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          value={query}
          placeholder="Hledat typ nebo napsat nový…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              // Enter on a matching suggestion is an EXISTING pick (fires color);
              // otherwise it commits the typed value as a new free-text type.
              if (filtered.length > 0) selectExisting(filtered[0]);
              else if (showFreeText) selectFreeText(q);
            }
          }}
        />
        {open && (filtered.length > 0 || showFreeText) ? (
          <ul className="bg-popover border-border absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border p-1 shadow-[var(--shadow)]">
            {showFreeText ? (
              <li>
                <button
                  type="button"
                  className="hover:bg-muted w-full rounded px-2 py-1 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectFreeText(q);
                  }}
                >
                  Přidat „{q}“ (nový typ)
                </button>
              </li>
            ) : null}
            {filtered.map((t) => (
              <li key={t.type}>
                <button
                  type="button"
                  className="hover:bg-muted w-full rounded px-2 py-1 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectExisting(t);
                  }}
                >
                  {t.type}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {value ? (
        <div className="flex items-center gap-3">
          <span className="text-foreground min-w-0 flex-1 truncate text-sm">
            {value}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
          >
            Vymazat
          </Button>
        </div>
      ) : null}

      {/* Hidden input submitted with the form. Prefer the committed value; if the
          user typed a type but didn't commit it, submit the pending text. */}
      <input type="hidden" name="type" value={value || q} />
    </div>
  );
}
