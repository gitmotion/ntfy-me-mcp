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
 * @throws Error starting with "Invalid NTFY_TOPICS_ALLOWLIST" when an entry is
 * invalid (naming its 1-based position, never its value) or when the value is
 * set but lists no topics (e.g. ",,"), which would otherwise mean "no allowlist"
 */
export function parseTopicAllowlist(value?: string): string[] {
    if (!value?.trim()) {
        return [];
    }

    const topics = value
        .split(",")
        .map((entry, index) => ({ entry: entry.trim(), position: index + 1 }))
        .filter(({ entry }) => entry)
        .map(({ entry, position }) => validateNtfyTopic(entry, `NTFY_TOPICS_ALLOWLIST entry ${position}`));

    if (topics.length === 0) {
        throw new Error("Invalid NTFY_TOPICS_ALLOWLIST: no topics listed.");
    }

    return [...new Set(topics)];
}
