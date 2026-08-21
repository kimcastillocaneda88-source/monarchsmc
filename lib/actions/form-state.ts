/**
 * Shared form-action state.
 *
 * Deliberately NOT in a "use server" module: those may only export async
 * functions, so a plain constant exported from one is stripped at runtime and
 * arrives as `undefined` in the client component.
 */
export interface FormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
}

export const IDLE_FORM_STATE: FormState = { status: "idle", message: "", fieldErrors: {} };

export interface ActionResult {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const OK: ActionResult = { ok: true };
