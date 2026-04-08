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

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error(
            `Invalid ${fieldName}: unsupported scheme "${parsed.protocol}". Only http:// and https:// URLs are supported.`
        );
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
    if (error instanceof Error) {
        // Only allow explicit safe error messages through directly.
        if (
            error.message.startsWith("Invalid ntfyUrl:") ||
            error.message.startsWith("Invalid ntfy URL:") ||
            error.message.startsWith("Invalid ntfyTopic:") ||
            error.message.startsWith("Invalid NTFY_TOPIC:") ||
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
