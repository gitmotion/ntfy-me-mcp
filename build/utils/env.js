const TRUE_VALUES = new Set(["true", "1", "yes"]);
/**
 * Parses an opt-in boolean environment variable.
 * Only "true", "1" and "yes" (case-insensitive, surrounding whitespace ignored)
 * enable the flag; anything else, including unset, leaves it disabled.
 *
 * @param value The raw environment variable value
 * @returns True when the flag is explicitly enabled
 */
export function parseBooleanEnv(value) {
    return TRUE_VALUES.has(value?.trim().toLowerCase() ?? "");
}
