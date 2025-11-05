import { captureError } from "~/src/lib/utils/sentry";

// Preserve original console methods
const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);

function extractError(args: any[]): Error | string | undefined {
  for (const a of args) {
    if (a instanceof Error) return a;
    if (typeof a === "string") return a;
    if (a && typeof a === "object" && a.message) return String(a.message);
  }
  return undefined;
}

// Patch console.error to also report to Sentry via captureError
console.error = (...args: any[]) => {
  try {
    const payload = extractError(args);
    if (payload) {
      captureError(payload as any, {
        operation: "console.error",
        tags: { error_source: "console" },
        extra: { args: args.map((a) => (a instanceof Error ? a.message : a)) },
      });
    }
  } catch {}
  originalError(...args);
};

// Optionally patch console.warn for visibility (lower signal)
console.warn = (...args: any[]) => {
  try {
    const payload = extractError(args);
    if (payload) {
      captureError(payload as any, {
        operation: "console.warn",
        tags: { error_source: "console" },
        extra: { args: args.map((a) => (a instanceof Error ? a.message : a)) },
      });
    }
  } catch {}
  originalWarn(...args);
};
