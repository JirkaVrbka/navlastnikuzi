"use client";

import { useState, useTransition } from "react";
import { cn } from "cn";
import { updateUserRole } from "./actions";

type Role = "admin" | "organizer";

// A two-segment pill toggle matching the role badge on the users list: the
// active role is highlighted gold (same tokens as the former static badge), the
// other segment is the muted, clickable target. Clicking the inactive role calls
// the admin-only server action inside a transition; both anti-lockout guards live
// server-side, so a rejected change surfaces here as inline destructive text.
const segBase =
  "rounded-full border px-2.5 py-1 text-[10px] tracking-[0.1em] uppercase outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-60";
const activeCls = "border-gold/40 text-gold bg-gold/10";
const inactiveCls =
  "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground";

const OPTIONS: { role: Role; label: string }[] = [
  { role: "admin", label: "Administrátor" },
  { role: "organizer", label: "Organizátor" },
];

export function RoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const choose = (role: Role) => {
    if (role === currentRole || isSelf || pending) return;
    setError("");
    startTransition(async () => {
      const res = await updateUserRole(userId, role);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div
        className="flex gap-1"
        title={isSelf ? "Nemůžete změnit vlastní roli." : undefined}
      >
        {OPTIONS.map(({ role, label }) => {
          const active = currentRole === role;
          return (
            <button
              key={role}
              type="button"
              aria-pressed={active}
              disabled={isSelf || pending}
              onClick={() => choose(role)}
              className={cn(segBase, active ? activeCls : inactiveCls)}
            >
              {label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-destructive text-[10px] leading-tight" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
