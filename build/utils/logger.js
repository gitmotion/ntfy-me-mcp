/**
 * Describes an error for the stderr log: name, message and, when present, the
 * cause's code and message (e.g. `fetch failed` → `ECONNREFUSED`).
 */
export function describeError(error) {
    if (!(error instanceof Error)) {
        return String(error);
    }
    let description = `${error.name}: ${error.message}`;
    const cause = error.cause;
    if (cause instanceof Error) {
        const code = cause.code;
        description += ` (cause: ${typeof code === "string" ? `${code} ` : ""}${cause.message})`;
    }
    return description;
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
