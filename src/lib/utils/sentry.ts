import * as Sentry from "@sentry/react-native";
export function captureError(
  error: unknown,
  context?: {
    operation?: string;
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);

  Sentry.captureException(error, {
    tags: {
      error_type: "manual_capture",
      ...context?.tags,
    },
    extra: {
      operation: context?.operation,
      error_message: errorMessage,
      ...context?.extra,
    },
  });
}

/**
 * Captures a message (non-error) with context
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): void {
  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  });
}
