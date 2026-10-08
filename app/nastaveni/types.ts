// Shared, non-server module: a "use server" file (actions.ts) may only export
// async functions, so this state shape lives here and is imported by both the
// actions and the client forms.

// Account settings forms — a single error + success message.
export type ActionState = { error: string; success: string };
export const initialActionState: ActionState = { error: "", success: "" };
