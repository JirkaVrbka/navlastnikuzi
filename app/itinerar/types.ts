// Shared, non-server module: a "use server" file (actions.ts) may only export
// async functions, so these state shapes live here and are imported by both the
// actions and the client forms.

// Day forms (create/edit) — a single error + success message.
export type ActionState = { error: string; success: string };
export const initialActionState: ActionState = { error: "", success: "" };

// Event form — per-field errors (shown at the field) plus a general error.
export type EventFormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};
export const initialEventFormState: EventFormState = {};
