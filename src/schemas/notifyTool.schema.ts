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
            "Optional custom ntfy URL (defaults to NTFY_URL env var or https://ntfy.sh)"
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

export type NotifyToolInput = z.infer<typeof notifyToolInputSchema>;
