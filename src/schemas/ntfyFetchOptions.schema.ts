import { z } from "zod";
import { ntfyPrioritySchema } from "./ntfyPriority.schema.js";
import { ntfyTopicSchema } from "./ntfyTopic.schema.js";

export const ntfyFetchOptionsSchema = z.object({
    url: z.string(),
    topic: ntfyTopicSchema,
    token: z.string().optional(),
    since: z.union([z.string(), z.number()]).optional(),
    messageId: z.string().optional(),
    messageText: z.string().optional(),
    messageTitle: z.string().optional(),
    priorities: z.union([ntfyPrioritySchema, z.array(ntfyPrioritySchema)]).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
});

export type NtfyFetchOptions = z.infer<typeof ntfyFetchOptionsSchema>;