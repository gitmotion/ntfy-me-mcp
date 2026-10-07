import { z } from "zod";
export const NTFY_TOPIC_MAX_LENGTH = 128;
export const NTFY_TOPIC_PATTERN = /^[A-Za-z0-9_-]+$/;
export const ntfyTopicSchema = z
    .string()
    .trim()
    .min(1, "ntfyTopic cannot be empty")
    .max(NTFY_TOPIC_MAX_LENGTH, `ntfyTopic must be ${NTFY_TOPIC_MAX_LENGTH} characters or fewer`)
    .regex(NTFY_TOPIC_PATTERN, "ntfyTopic may only contain letters, numbers, underscores, and hyphens");
export function createOptionalNtfyTopicSchema(description) {
    return z
        .union([
        z.string().regex(/^\s*$/),
        ntfyTopicSchema,
    ])
        .optional()
        .transform((value) => {
        const trimmedValue = value?.trim();
        return trimmedValue ? trimmedValue : undefined;
    })
        .describe(description);
}
/**
 * Optional topic limited to `topics` (NTFY_TOPICS_ALLOWLIST, #34). Advertised
 * to the agent as a plain JSON-schema enum. Surrounding whitespace is trimmed
 * and a blank value means "not provided" (the default topic), like the other
 * optional inputs.
 */
export function createAllowedTopicSchema(topics, description) {
    return z
        .preprocess((value) => (typeof value === "string" ? value.trim() || undefined : value), z.enum(topics).optional())
        .describe(description);
}
