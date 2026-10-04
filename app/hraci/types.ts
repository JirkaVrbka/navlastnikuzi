// Shared, non-server module: a "use server" file (actions.ts) may only export
// async functions, so this state shape lives here and is imported by both the
// actions and the client form.

// Player create/edit form — per-field errors (shown at the field) plus a
// general error (mirrors the itinerary EventFormState).
export type PlayerFormState = {
  formError?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};
export const initialPlayerFormState: PlayerFormState = {};
