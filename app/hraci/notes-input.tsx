"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// One textarea + "Přidat" → each value becomes a removable note row. Submits a
// hidden `notes` input per value (plus any pending typed text). Mirrors the
// itinerary ItemsInput pattern, but notes can be multi-line so each shows as a
// row rather than an inline pill.
export function NotesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [text, setText] = useState("");
  const pending = text.trim();

  function add() {
    if (!pending) return;
    onChange([...value, pending]);
    setText("");
  }
  function removeAt(i: number) {
    onChange(value.filter((_, x) => x !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Textarea
          value={text}
          placeholder="Přidat poznámku…"
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add}>
          Přidat
        </Button>
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {value.map((it, i) => (
            <li
              key={i}
              className="bg-muted flex items-start gap-2 rounded-md border px-2 py-1 text-sm"
            >
              <span className="min-w-0 flex-1 whitespace-pre-wrap">{it}</span>
              <button
                type="button"
                aria-label={`Odebrat poznámku ${i + 1}`}
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => removeAt(i)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {value.map((it, i) => (
        <input key={i} type="hidden" name="notes" value={it} />
      ))}
      {/* Commit pending typed text if the user submits without adding it. */}
      {pending ? <input type="hidden" name="notes" value={pending} /> : null}
    </div>
  );
}
