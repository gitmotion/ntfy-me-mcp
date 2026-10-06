/**
 * Removes credentials from text before it's logged: bearer token values and
 * URL userinfo (`scheme://user:pass@`).
 */
function redactSecrets(text: string): string {
  return text
    .replace(/Bearer [^"']*/g, "Bearer [REDACTED]")
    .replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^/\s@]+@/gi, "$1[REDACTED]@");
}

/**
 * Describes an error for the stderr log: name, message and, when present, the
 * cause's code and message (e.g. `fetch failed` → `ECONNREFUSED`), plus the
 * individual errors of an AggregateError cause (IPv6/IPv4 "Happy Eyeballs").
 * Credentials are redacted.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return redactSecrets(String(error));
  }

  let description = `${error.name}: ${error.message}`;
  const cause: unknown = error.cause;
  if (cause instanceof Error) {
    const code = (cause as { code?: unknown }).code;
    const details = [typeof code === "string" ? code : "", cause.message]
      .filter(Boolean)
      .join(" ");
    const nested =
      cause instanceof AggregateError
        ? cause.errors
            .map((inner: unknown) => (inner instanceof Error ? inner.message : String(inner)))
            .join("; ")
        : "";
    description += ` (cause: ${[details, nested].filter(Boolean).join(": ")})`;
  }

  return redactSecrets(description);
}

export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string): void {
    console.error(`[NTFYME-LOG-INFO]: ${message}`);
  }

  public warn(message: string): void {
    console.error(`[NTFYME-LOG-WARNING]: ${message}`);
  }

  public error(message: string): void {
    console.error(`[NTFYME-LOG-ERROR]: ${message}`);
  }
}
