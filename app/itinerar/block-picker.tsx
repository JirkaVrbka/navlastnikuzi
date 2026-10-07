"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Searchable SINGLE-select free-text block: type to filter blocks already used on
// other events; pick one, or add a new one as free text. Max one block per event.
// Mirrors the organizer picker's dropdown look, but commits a single string.
// Submits one hidden `block` input (the committed value, else the pending text).
export function BlockPicker({
  blocks,
  value,
  onChange,
}: {
  blocks: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const q = query.trim();
  const ql = q.toLowerCase();

  // Suggestions: all known blocks matching the query, excluding the current value.
  const filtered = blocks.filter(
    (b) =>
      b.toLowerCase() !== value.toLowerCase() &&
      (ql === "" || b.toLowerCase().includes(ql)),
  );

  const exact = blocks.some((b) => b.toLowerCase() === ql);
  const showFreeText = q !== "" && !exact;

  function select(next: string) {
    onChange(next.trim());
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          value={query}
          placeholder="Hledat blok nebo napsat nový…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length > 0) select(filtered[0]);
              else if (showFreeText) select(q);
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
                    select(q);
                  }}
                >
                  Přidat „{q}“ (nový blok)
                </button>
              </li>
            ) : null}
            {filtered.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  className="hover:bg-muted w-full rounded px-2 py-1 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(b);
                  }}
                >
                  {b}
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
          user typed a block but didn't commit it, submit the pending text. */}
      <input type="hidden" name="block" value={value || q} />
    </div>
  );
}
