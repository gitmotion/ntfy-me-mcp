import {
    NTFY_TOPIC_MAX_LENGTH,
    NTFY_TOPIC_PATTERN,
} from "../schemas/ntfyTopic.schema.js";

/**
 * Validates that a URL string is a proper HTTP or HTTPS URL.
 * Prevents prompt injection via malicious URL parameters.
 *
 * @param url The URL string to validate
 * @param fieldName The name of the field being validated (for error messages)
 * @throws Error if the URL is not valid or uses an unsupported scheme
 */
export function validateNtfyUrl(url: string, fieldName = "ntfyUrl"): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error(
            `Invalid ${fieldName}: not a valid URL. Only http:// and https:// URLs are supported.`
        );
    }

    if (parsed.username || parsed.password) {
        throw new Error(
            `Invalid ${fieldName}: credentials in the URL are not supported. Use NTFY_TOKEN or the accessToken parameter instead.`
        );
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error(
            `Invalid ${fieldName}: unsupported scheme. Only http:// and https:// URLs are supported.`
        );
    }
}

/** ntfy shows at most this many action buttons per notification (#29). */
export const NTFY_MAX_ACTIONS = 3;

/**
 * Validates a view action's link: http(s) only, no embedded credentials (#29).
 * The messages are fixed, so nothing the agent sent is echoed back.
 *
 * @param url The link the action button opens
 * @throws Error with an "Invalid action url:" message if the link isn't allowed
 */
export function validateActionUrl(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error(
            "Invalid action url: not a valid URL. Only http:// and https:// links are supported."
        );
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Invalid action url: only http:// and https:// links are supported.");
    }

    if (parsed.username || parsed.password) {
        throw new Error("Invalid action url: links with embedded credentials are not supported.");
    }
}

/**
 * Enforces the view-action rules at request-building time, the same rules the
 * tool schema applies, so callers that bypass the schema can't send more.
 *
 * @param actions The agent-supplied view actions
 * @throws Error with an "Invalid actions:" or "Invalid action url:" message
 */
export function validateViewActions(actions: readonly { url: string }[]): void {
    if (actions.length > NTFY_MAX_ACTIONS) {
        throw new Error(
            `Invalid actions: at most ${NTFY_MAX_ACTIONS} view actions are allowed per notification.`
        );
    }

    for (const action of actions) {
        validateActionUrl(action.url);
    }
}

/**
 * Checks whether two URLs share an origin (scheme, host and port).
 * Used to decide whether the configured NTFY_TOKEN may be sent to a URL.
 *
 * @param url The URL a request is about to be sent to
 * @param otherUrl The URL to compare against (e.g. NTFY_URL)
 * @returns True when both parse and their origins match; false otherwise
 */
export function isSameOrigin(url: string, otherUrl: string): boolean {
    try {
        const origin = new URL(url).origin;
        // Opaque origins (file:, data:, mailto:, …) all serialize to "null".
        return origin !== "null" && origin === new URL(otherUrl).origin;
    } catch {
        return false;
    }
}

/**
 * Detects unresolved client-side input placeholders such as ${input:ntfy_token}.
 * The server cannot inspect editor config directly, but it can identify placeholder
 * values that were passed through unchanged.
 *
 * @param value The configured token value
 * @returns True when the value is an unresolved input placeholder
 */
export function isUnresolvedInputReference(value?: string | null): boolean {
    if (!value) {
        return false;
    }

    return /^\$\{input:[^}]+\}$/.test(value.trim());
}

/**
 * Validates that an ntfy topic uses only a conservative set of URL-safe characters.
 *
 * @param topic The topic value to validate
 * @param fieldName The field name to use in error messages
 * @returns The trimmed topic value
 */
export function validateNtfyTopic(
    topic: string,
    fieldName = "ntfyTopic"
): string {
    const trimmedTopic = topic.trim();

    if (!trimmedTopic) {
        throw new Error(`Invalid ${fieldName}: topic cannot be empty.`);
    }

    if (trimmedTopic.length > NTFY_TOPIC_MAX_LENGTH) {
        throw new Error(
            `Invalid ${fieldName}: topic must be ${NTFY_TOPIC_MAX_LENGTH} characters or fewer.`
        );
    }

    if (!NTFY_TOPIC_PATTERN.test(trimmedTopic)) {
        throw new Error(
            `Invalid ${fieldName}: topic may only contain letters, numbers, underscores, and hyphens.`
        );
    }

    return trimmedTopic;
}

// Node error codes are constant identifiers (ECONNREFUSED, UND_ERR_CONNECT_TIMEOUT,
// CERT_HAS_EXPIRED, …), so a code matching this shape is safe to show the model.
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

// Codes that mean no connection was established, so the request can't have
// reached ntfy. Anything else (e.g. a reset after sending) may have published.
const CONNECT_PHASE_CODES = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "EAI_AGAIN",
    "EHOSTUNREACH",
    "ENETUNREACH",
    "UND_ERR_CONNECT_TIMEOUT",
]);
const TLS_ERROR_CODE_PATTERN = /CERT|SELF_SIGNED|UNABLE_TO_|^ERR_TLS_|^ERR_SSL_/;

function isConnectPhaseError(code: string): boolean {
    return CONNECT_PHASE_CODES.has(code) || TLS_ERROR_CODE_PATTERN.test(code);
}

/**
 * Extracts the error code from a native `fetch` network failure
 * (`TypeError: fetch failed` with a `cause.code`), if it looks like a plain
 * Node error identifier.
 */
function getNetworkErrorCode(error: unknown): string | undefined {
    if (!(error instanceof TypeError) || error.message !== "fetch failed") {
        return undefined;
    }

    const cause: unknown = error.cause;
    const code =
        typeof cause === "object" && cause !== null
            ? (cause as { code?: unknown }).code
            : undefined;

    return typeof code === "string" && ERROR_CODE_PATTERN.test(code) ? code : undefined;
}

/**
 * Sanitizes an error message to prevent prompt injection via reflected input.
 * Truncates the message and removes any potential instruction overrides.
 *
 * @param error The caught error
 * @param fallbackMessage A safe fallback message if sanitization is needed
 * @returns A sanitized error message string
 */
export function sanitizeErrorMessage(
    error: unknown,
    fallbackMessage: string
): string {
    const networkErrorCode = getNetworkErrorCode(error);
    if (networkErrorCode) {
        return isConnectPhaseError(networkErrorCode)
            ? `${fallbackMessage}: could not connect to the ntfy server (${networkErrorCode})`
            : `${fallbackMessage}: the request to the ntfy server failed (${networkErrorCode})`;
    }

    if (error instanceof Error) {
        // Only allow explicit safe error messages through directly.
        if (
            error.message.startsWith("Invalid url:") ||
            error.message.startsWith("Invalid ntfyUrl:") ||
            error.message.startsWith("Invalid ntfy URL:") ||
            error.message.startsWith("Invalid NTFY_URL:") ||
            error.message.startsWith("Invalid topic:") ||
            error.message.startsWith("Invalid ntfyTopic:") ||
            error.message.startsWith("Invalid NTFY_TOPIC:") ||
            error.message.startsWith("Invalid access token:") ||
            error.message.startsWith("Invalid action url:") ||
            error.message.startsWith("Invalid actions:") ||
            error.message.startsWith("Authentication failed when sending notification.") ||
            error.message.startsWith("Authentication failed when fetching messages.") ||
            error.message.startsWith("Failed to send ntfy notification. Status code:") ||
            error.message.startsWith("Failed to fetch ntfy messages. Status code:")
        ) {
            return error.message;
        }

        return fallbackMessage;
    }

    return fallbackMessage;
}

const ACCESS_TOKEN_PATTERN = /^[\x21-\x7e]+$/;

/**
 * Checks that an access token can be sent in an Authorization header.
 * Rejecting it here, with a fixed message, keeps the token out of the
 * header-validation errors fetch would otherwise throw (and we'd log).
 *
 * Surrounding whitespace is trimmed first (fetch trims header values anyway).
 *
 * @param token The access token (from accessToken or NTFY_TOKEN)
 * @returns The trimmed token when it's valid
 * @throws Error with an allow-listed message when it isn't
 */
export function validateAccessToken(token: string): string {
    const trimmedToken = token.trim();
    if (!ACCESS_TOKEN_PATTERN.test(trimmedToken)) {
        throw new Error(
            "Invalid access token: it may only contain printable ASCII characters without spaces."
        );
    }

    return trimmedToken;
}

/**
 * Validates the startup environment configuration (NTFY_TOPIC and NTFY_URL).
 * Fails fast with clear error messages before connecting or logging configuration.
 *
 * @param topic The NTFY_TOPIC environment variable
 * @param url The NTFY_URL environment variable (defaults to https://ntfy.sh)
 * @returns The validated topic and url
 * @throws Error if topic is missing/invalid or url is invalid
 */
export function validateStartupConfig(
    topic: string | undefined,
    url: string = "https://ntfy.sh"
): { topic: string; url: string } {
    if (!topic) {
        throw new Error(
            "NTFY_TOPIC environment variable is required. Please ensure it's added to your .env file or passed as an environment variable."
        );
    }

    const validatedTopic = validateNtfyTopic(topic, "NTFY_TOPIC");
    validateNtfyUrl(url, "NTFY_URL");

    return { topic: validatedTopic, url };
}

