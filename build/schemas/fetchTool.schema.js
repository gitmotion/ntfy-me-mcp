import { z } from "zod";
import { createOptionalNtfyTopicSchema } from "./ntfyTopic.schema.js";
export const fetchToolInputSchema = z.object({
    ntfyUrl: z
        .string()
        .optional()
        .describe("Optional custom ntfy server URL (defaults to NTFY_URL env var or https://ntfy.sh)"),
    ntfyTopic: createOptionalNtfyTopicSchema("Optional custom ntfy topic/channel to get messages from (defaults to NTFY_TOPIC env var)"),
    accessToken: z
        .string()
        .optional()
        .describe("Optional access token for authentication (defaults to NTFY_TOKEN env var)"),
    since: z
        .union([z.string(), z.number()])
        .optional()
        .describe("How far back to retrieve messages: timespan (e.g., '10m', '1h', '1d'), timestamp, message ID, or 'all' for all messages. Default: 10 minutes"),
    messageId: z.string().optional().describe("Find a specific message by its ID"),
    messageText: z
        .string()
        .optional()
        .describe("Find messages containing this exact text content"),
    messageTitle: z
        .string()
        .optional()
        .describe("Find messages with this exact title/subject"),
    priorities: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Find messages with specific priority levels (min, low, default, high, max)"),
    tags: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe("Find messages with specific tags (e.g., 'error', 'warning', 'success')"),
});
