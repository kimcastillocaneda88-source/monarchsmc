/** Errors that are safe to surface to end users. Raw Firebase errors never are. */

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You must sign in to continue.") {
    super("unauthorized", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that.") {
    super("forbidden", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "That item could not be found.") {
    super("not_found", message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts. Please try again later.") {
    super("rate_limited", message, 429);
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string>;
  constructor(fieldErrors: Record<string, string>, message = "Please correct the highlighted fields.") {
    super("validation_failed", message, 422);
    this.fieldErrors = fieldErrors;
  }
}

const FRIENDLY_AUTH_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email address and password combination was not recognised.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account has been disabled. Contact a club officer.",
  "auth/user-not-found": "That email address and password combination was not recognised.",
  "auth/wrong-password": "That email address and password combination was not recognised.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "We could not reach the server. Check your connection and try again.",
  "auth/weak-password": "Choose a password of at least 12 characters.",
  "auth/email-already-in-use": "An account already exists for that email address.",
  "auth/requires-recent-login": "For security, sign in again before making this change.",
};

/**
 * Maps any thrown value to a message that can be shown in the UI.
 * Never leaks Firebase internals, stack traces or document paths.
 */
export function toUserMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof AppError) return error.message;
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);
    if (code === "FIREBASE_NOT_CONFIGURED" || code === "FIREBASE_ADMIN_NOT_CONFIGURED") {
      return "The club platform is not fully configured yet. Please try again later.";
    }
    const friendly = FRIENDLY_AUTH_MESSAGES[code];
    if (friendly) return friendly;
  }
  if (error instanceof Error && error.message === "FIREBASE_NOT_CONFIGURED") {
    return "The club platform is not fully configured yet. Please try again later.";
  }
  return fallback;
}
