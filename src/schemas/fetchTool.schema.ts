import { z } from "zod";
import { createOptionalNtfyPrioritiesSchema } from "./ntfyPriority.schema.js";
import { createOptionalNtfyTopicSchema } from "./ntfyTopic.schema.js";

export const fetchToolInputSchema = z.object({
    url: z
        .string()
        .optional()
        .describe(
            "Optional custom ntfy server URL (defaults to NTFY_URL env var or https://ntfy.sh). NTFY_TOKEN is only sent to NTFY_URL; use accessToken for other servers"
        ),
    topic: createOptionalNtfyTopicSchema(
        "Optional custom ntfy topic/channel to get messages from (defaults to NTFY_TOPIC env var)"
    ),
    accessToken: z
        .string()
        .optional()
        .describe(
            "Optional access token for authentication (defaults to NTFY_TOKEN env var)"
        ),
    since: z
        .union([z.string(), z.number()])
        .optional()
        .describe(
            "How far back to retrieve messages: timespan (e.g., '10m', '1h', '1d'), timestamp, message ID, or 'all' for all messages. Default: 10 minutes"
        ),
    messageId: z.string().optional().describe("Find a specific message by its ID"),
    messageText: z
        .string()
        .optional()
        .describe("Find messages containing this exact text content"),
    messageTitle: z
        .string()
        .optional()
        .describe("Find messages with this exact title/subject"),
    priorities: createOptionalNtfyPrioritiesSchema(
        "Find messages with specific priority levels (min, low, default, high, max)"
    ),
    tags: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe(
            "Find messages with specific tags (e.g., 'error', 'warning', 'success')"
        ),
});

// `topic` is optional because the tool is registered without it when topic
// overrides are disabled (and `url` is already optional) (see createFetchToolInputSchema).
export type FetchToolInput = Omit<z.infer<typeof fetchToolInputSchema>, "topic"> & {
    topic?: string;
};

/**
 * Builds the ntfy_me_fetch input schema for the server's destination policy.
 * Unless overrides are allowed, `topic` and/or `url` are left out entirely so
 * the agent can't see or send them: requests go to NTFY_TOPIC on NTFY_URL.
 */
export function createFetchToolInputSchema({
    allowTopicOverride,
    allowUrlOverride,
}: {
    allowTopicOverride: boolean;
    allowUrlOverride: boolean;
}) {
    return fetchToolInputSchema.omit({
        ...(allowTopicOverride ? {} : { topic: true as const }),
        ...(allowUrlOverride ? {} : { url: true as const }),
    });
}
