import { z } from "zod";
import { createOptionalDefaultedNtfyPrioritySchema } from "./ntfyPriority.schema.js";
import { createOptionalNtfyTopicSchema } from "./ntfyTopic.schema.js";
import { viewActionSchema } from "./viewAction.schema.js";

export const notifyToolInputSchema = z.object({
    title: z.string().describe("Notification title/status"),
    message: z.string().describe("Notification message/body"),
    url: z
        .string()
        .optional()
        .describe(
            "Optional custom ntfy URL (defaults to NTFY_URL env var or https://ntfy.sh). NTFY_TOKEN is only sent to NTFY_URL; use accessToken for other servers"
        ),
    topic: createOptionalNtfyTopicSchema(
        "Optional custom ntfy topic (defaults to NTFY_TOPIC env var)"
    ),
    accessToken: z
        .string()
        .optional()
        .describe(
            "Optional access token for authentication (defaults to NTFY_TOKEN env var)"
        ),
    priority: createOptionalDefaultedNtfyPrioritySchema(
        "Message priority level"
    ),
    tags: z.array(z.string()).optional().describe("Tags for the notification"),
    markdown: z
        .boolean()
        .optional()
        .describe("Whether to format the message with Markdown support"),
    actions: z
        .array(viewActionSchema)
        .optional()
        .describe("Optional array of view actions to add to the notification"),
});

// `topic` is optional because the tool is registered without it when topic
// overrides are disabled (and `url` is already optional) (see createNotifyToolInputSchema).
export type NotifyToolInput = Omit<z.infer<typeof notifyToolInputSchema>, "topic"> & {
    topic?: string;
};

/**
 * Builds the ntfy_me input schema for the server's destination policy.
 * Unless overrides are allowed, `topic` and/or `url` are left out entirely so
 * the agent can't see or send them: requests go to NTFY_TOPIC on NTFY_URL.
 *
 * Note: the static return type is the most restricted shape (neither key);
 * which keys exist at runtime depends on the flags. Handlers take the input
 * type with `topic`/`url` optional, so either shape is accepted.
 */
export function createNotifyToolInputSchema({
    allowTopicOverride,
    allowUrlOverride,
}: {
    allowTopicOverride: boolean;
    allowUrlOverride: boolean;
}) {
    return notifyToolInputSchema.omit({
        ...(allowTopicOverride ? {} : { topic: true as const }),
        ...(allowUrlOverride ? {} : { url: true as const }),
    });
}
