import type { EliminateReason } from "@/lib/validation/players";

// Czech label for an elimination reason.
export function reasonLabel(reason: string | null): string {
  if (reason === "killed") return "Zavražděn(a) traitory";
  if (reason === "voted_out") return "Vyřazen(a) hlasováním";
  return "";
}

// The two reasons offered when eliminating a player.
export const REASON_OPTIONS: { value: EliminateReason; label: string }[] = [
  { value: "killed", label: "Zavražděn(a) traitory" },
  { value: "voted_out", label: "Vyřazen(a) hlasováním" },
];

// Initials for the photo fallback (up to two letters from the name).
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
