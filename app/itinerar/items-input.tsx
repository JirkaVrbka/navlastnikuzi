"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pill } from "./pill";

// One input + "Přidat" (or Enter) → each value becomes a removable pill.
// Submits a hidden `items` input per value (plus any pending typed text).
export function ItemsInput({
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
        <Input
          value={text}
          placeholder="Přidat položku…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
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
        <ul className="flex flex-wrap gap-2">
          {value.map((it, i) => (
            <li key={i}>
              <Pill label={it} onRemove={() => removeAt(i)} />
            </li>
          ))}
        </ul>
      ) : null}

      {value.map((it, i) => (
        <input key={i} type="hidden" name="items" value={it} />
      ))}
      {/* Commit pending typed text if the user submits without adding it. */}
      {pending ? <input type="hidden" name="items" value={pending} /> : null}
    </div>
  );
}
