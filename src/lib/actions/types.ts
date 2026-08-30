import { ActionError } from "@/lib/action-error";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: TranslationKey;
  /** Maps a form field name to the translation key of its error. */
  fieldErrors?: Record<string, TranslationKey>;
};

export const idleState: ActionState = { status: "idle" };

export function success(message: TranslationKey): ActionState {
  return { status: "success", message };
}

export function failure(
  message: TranslationKey,
  fieldErrors?: Record<string, TranslationKey>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

/**
 * Whether a failed query breached a unique constraint. Drizzle wraps driver
 * errors, so the Postgres code sits on the cause chain rather than on the error
 * that was thrown.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current != null && depth < 5; depth += 1) {
    if (
      typeof current === "object" &&
      "code" in current &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Wraps an action body so expected failures become translated messages while
 * `redirect()` and other framework control-flow errors keep bubbling up.
 */
export async function runAction(
  body: () => Promise<ActionState>,
): Promise<ActionState> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof ActionError) return failure(error.key);
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (error as { digest: string }).digest === "NEXT_NOT_FOUND")
    ) {
      throw error;
    }
    console.error(error);
    return failure("error.unexpected");
  }
}
