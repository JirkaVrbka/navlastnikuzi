import type { Dispatch, SetStateAction } from "react";

// base-ui reports these reasons when a dialog wants to close by "dismiss".
const DISMISS_REASONS = new Set(["outside-press", "escape-key", "focus-out"]);

// An onOpenChange handler that ignores outside-click / Escape, so the dialog
// closes only via the × button or programmatically (e.g. after a successful save).
export function dismissibleOnlyByButton(
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  return (nextOpen: boolean, details?: { reason?: string }) => {
    if (!nextOpen && details?.reason && DISMISS_REASONS.has(details.reason)) {
      return;
    }
    setOpen(nextOpen);
  };
}
