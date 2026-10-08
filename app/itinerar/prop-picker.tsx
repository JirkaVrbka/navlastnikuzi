"use client";

import { useState } from "react";
import type { PickableProp } from "@/lib/db/props";
import { Input } from "@/components/ui/input";
import { Pill } from "./pill";

export type ItemValue =
  | { type: "catalog"; id: string; name: string }
  | { type: "text"; name: string };

// Searchable multi-select mirroring OrganizerPicker: type to filter catalog
// props; pick one (a linked pill) or add free text (Enter / the explicit top
// option). Each pick becomes a removable pill and order is preserved. Submits a
// SINGLE hidden `items` input holding a JSON array of { propId?, name } entries.
export function PropPicker({
  props,
  value,
  onChange,
}: {
  props: PickableProp[];
  value: ItemValue[];
  onChange: (next: ItemValue[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedPropIds = new Set(
    value
      .filter((v) => v.type === "catalog")
      .map((v) => (v as { id: string }).id),
  );
  const selectedTextNames = new Set(
    value.filter((v) => v.type === "text").map((v) => v.name.toLowerCase()),
  );

  const q = query.trim();
  const ql = q.toLowerCase();

  const filteredProps = props.filter(
    (p) =>
      !selectedPropIds.has(p.id) &&
      (ql === "" || p.name.toLowerCase().includes(ql)),
  );

  const exactProp = props.find((p) => p.name.toLowerCase() === ql);
  const showFreeText = q !== "" && !exactProp && !selectedTextNames.has(ql);

  function addProp(p: PickableProp) {
    onChange([...value, { type: "catalog", id: p.id, name: p.name }]);
    setQuery("");
  }
  function addText(text: string) {
    const t = text.trim();
    if (!t || selectedTextNames.has(t.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...value, { type: "text", name: t }]);
    setQuery("");
  }
  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  // The committed items PLUS any pending typed free-text (so a submit without
  // pressing Enter still captures it) — matches OrganizerPicker's safety net.
  const emitted = [
    ...value.map((v) =>
      v.type === "catalog" ? { propId: v.id, name: v.name } : { name: v.name },
    ),
    ...(showFreeText ? [{ name: q }] : []),
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          value={query}
          placeholder="Hledat rekvizitu nebo přidat název…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filteredProps.length > 0) addProp(filteredProps[0]);
              else if (showFreeText) addText(q);
            }
          }}
        />
        {open && (filteredProps.length > 0 || showFreeText) ? (
          <ul className="bg-popover border-border absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border p-1 shadow-[var(--shadow)]">
            {showFreeText ? (
              <li>
                <button
                  type="button"
                  className="hover:bg-muted w-full rounded px-2 py-1 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addText(q);
                  }}
                >
                  Přidat „{q}“ (volný text)
                </button>
              </li>
            ) : null}
            {filteredProps.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="hover:bg-muted w-full rounded px-2 py-1 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addProp(p);
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((v, i) => (
            <li key={i}>
              <Pill label={v.name} onRemove={() => removeAt(i)} />
            </li>
          ))}
        </ul>
      ) : null}

      {/* Single hidden input: a JSON array [{propId?, name}] (committed + pending). */}
      <input type="hidden" name="items" value={JSON.stringify(emitted)} />
    </div>
  );
}
