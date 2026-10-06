/**
 * Removes credentials from text before it's logged: bearer token values and
 * URL userinfo (`scheme://user:pass@`).
 */
function redactSecrets(text) {
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
export function describeError(error) {
    if (!(error instanceof Error)) {
        return redactSecrets(String(error));
    }
    let description = `${error.name}: ${error.message}`;
    const cause = error.cause;
    if (cause instanceof Error) {
        const code = cause.code;
        const details = [typeof code === "string" ? code : "", cause.message.trim()]
            .filter(Boolean)
            .join(" ");
        const nested = cause instanceof AggregateError
            ? cause.errors
                .map((inner) => (inner instanceof Error ? inner.message : String(inner)))
                .join("; ")
            : "";
        description += ` (cause: ${[details, nested].filter(Boolean).join(": ")})`;
    }
    return redactSecrets(description);
}
export class Logger {
    static instance;
    constructor() { }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    info(message) {
        console.error(`[NTFYME-LOG-INFO]: ${message}`);
    }
    warn(message) {
        console.error(`[NTFYME-LOG-WARNING]: ${message}`);
    }
    error(message) {
        console.error(`[NTFYME-LOG-ERROR]: ${message}`);
    }
}
