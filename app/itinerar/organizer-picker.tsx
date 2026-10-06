"use client";

import { useState } from "react";
import type { PickableUser } from "@/lib/db/itinerary";
import { Input } from "@/components/ui/input";
import { Pill } from "./pill";

export type OrganizerValue =
  { type: "user"; id: string; label: string } | { type: "text"; label: string };

export function userLabel(u: { displayName: string | null; email: string }) {
  return u.displayName ? `${u.displayName} — ${u.email}` : u.email;
}

// Searchable multi-select: type to filter users; pick several; each pick becomes
// a removable pill. When the text matches no user, a top option adds it as a
// free-text organizer. Submits hidden organizerUserIds / organizerNames inputs.
export function OrganizerPicker({
  users,
  value,
  onChange,
}: {
  users: PickableUser[];
  value: OrganizerValue[];
  onChange: (next: OrganizerValue[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedUserIds = new Set(
    value.filter((v) => v.type === "user").map((v) => (v as { id: string }).id),
  );
  const selectedTextLabels = new Set(
    value.filter((v) => v.type === "text").map((v) => v.label.toLowerCase()),
  );

  const q = query.trim();
  const ql = q.toLowerCase();

  const filteredUsers = users.filter(
    (u) =>
      !selectedUserIds.has(u.id) &&
      (ql === "" || userLabel(u).toLowerCase().includes(ql)),
  );

  const exactUser = users.find(
    (u) =>
      userLabel(u).toLowerCase() === ql ||
      u.displayName?.toLowerCase() === ql ||
      u.email.toLowerCase() === ql,
  );
  const showFreeText = q !== "" && !exactUser && !selectedTextLabels.has(ql);

  function addUser(u: PickableUser) {
    onChange([...value, { type: "user", id: u.id, label: userLabel(u) }]);
    setQuery("");
  }
  function addText(text: string) {
    const t = text.trim();
    if (!t || selectedTextLabels.has(t.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...value, { type: "text", label: t }]);
    setQuery("");
  }
  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          value={query}
          placeholder="Hledat uživatele nebo přidat jméno…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filteredUsers.length > 0) addUser(filteredUsers[0]);
              else if (showFreeText) addText(q);
            }
          }}
        />
        {open && (filteredUsers.length > 0 || showFreeText) ? (
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
            {filteredUsers.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="hover:bg-muted w-full rounded px-2 py-1 text-left text-sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addUser(u);
                  }}
                >
                  {userLabel(u)}
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
              <Pill label={v.label} onRemove={() => removeAt(i)} />
            </li>
          ))}
        </ul>
      ) : null}

      {/* Hidden inputs submitted with the form. */}
      {value.map((v, i) =>
        v.type === "user" ? (
          <input key={i} type="hidden" name="organizerUserIds" value={v.id} />
        ) : (
          <input key={i} type="hidden" name="organizerNames" value={v.label} />
        ),
      )}
      {/* Commit pending typed text (as free-text) if the user submits without
          pressing Enter — but only when it matches no existing user. */}
      {showFreeText ? (
        <input type="hidden" name="organizerNames" value={q} />
      ) : null}
    </div>
  );
}
