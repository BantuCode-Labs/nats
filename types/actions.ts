/**
 * Canonical server-action response shape used across the app.
 *
 * Prefer this over module-local redefinitions so callers can narrow on
 * `success` consistently and optional `fieldErrors` remain available.
 *
 * `data` is optional on success so mutation actions can return
 * `{ success: true }` without a payload.
 */
export type ActionResponse<T = unknown> =
  | { success: true; data?: T }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };
