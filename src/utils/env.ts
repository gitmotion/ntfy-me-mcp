import { validateNtfyTopic } from "./validation.js";

const TRUE_VALUES = new Set(["true", "1", "yes"]);

/**
 * Parses an opt-in boolean environment variable.
 * Only "true", "1" and "yes" (case-insensitive, surrounding whitespace ignored)
 * enable the flag; anything else, including unset, leaves it disabled.
 *
 * @param value The raw environment variable value
 * @returns True when the flag is explicitly enabled
 */
export function parseBooleanEnv(value?: string): boolean {
    return TRUE_VALUES.has(value?.trim().toLowerCase() ?? "");
}

/**
 * Parses NTFY_TOPICS_ALLOWLIST: a comma-separated list of topics the agent may
 * choose from. Entries are trimmed, empty entries dropped and duplicates
 * removed (first occurrence wins). Every entry must be a valid ntfy topic.
 *
 * @param value The raw environment variable value
 * @returns The allowed topics, or an empty array when unset or blank
 * @throws Error starting with "Invalid NTFY_TOPICS_ALLOWLIST:" for an invalid entry
 */
export function parseTopicAllowlist(value?: string): string[] {
    const topics = (value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => validateNtfyTopic(entry, "NTFY_TOPICS_ALLOWLIST"));

    return [...new Set(topics)];
}
