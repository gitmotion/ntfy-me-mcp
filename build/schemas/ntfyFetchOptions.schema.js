import { z } from "zod";
import { ntfyTopicSchema } from "./ntfyTopic.schema.js";
export const ntfyFetchOptionsSchema = z.object({
    ntfyUrl: z.string(),
    topic: ntfyTopicSchema,
    token: z.string().optional(),
    since: z.union([z.string(), z.number()]).optional(),
    messageId: z.string().optional(),
    messageText: z.string().optional(),
    messageTitle: z.string().optional(),
    priorities: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
});
