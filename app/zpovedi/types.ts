// Shared, non-server module: a "use server" file (actions.ts) may only export
// async functions, so these state shapes live here and are imported by both the
// actions and the client forms.

// Form state — a single error + success message (mirrors konkláve).
export type ActionState = { error: string; success: string };
export const initialActionState: ActionState = { error: "", success: "" };
