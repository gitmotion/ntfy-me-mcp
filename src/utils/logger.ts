/**
 * Describes an error for the stderr log: name, message and, when present, the
 * cause's code and message (e.g. `fetch failed` → `ECONNREFUSED`).
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  let description = `${error.name}: ${error.message}`;
  const cause: unknown = error.cause;
  if (cause instanceof Error) {
    const code = (cause as { code?: unknown }).code;
    description += ` (cause: ${typeof code === "string" ? `${code} ` : ""}${cause.message})`;
  }

  return description;
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
