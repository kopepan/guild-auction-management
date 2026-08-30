import type { TranslationKey } from "@/lib/i18n/dictionaries";

/**
 * Thrown by server actions for expected failures so the caller can surface a
 * translated message. Kept free of server-only imports because the action
 * result helpers that reference it are also bundled for the client.
 */
export class ActionError extends Error {
  constructor(readonly key: TranslationKey) {
    super(key);
    this.name = "ActionError";
  }
}
