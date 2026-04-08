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
    return ntfyTopicSchema.optional().describe(description);
}
