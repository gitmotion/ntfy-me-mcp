import { z } from "zod";
export const messageAttachmentSchema = z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
    expires: z.number(),
    url: z.string(),
});
export const messageDataSchema = z
    .object({
    id: z.string(),
    time: z.number(),
    event: z.string(),
    topic: z.string(),
    message: z.string().optional(),
    title: z.string().optional(),
    priority: z.number().optional(),
    tags: z.array(z.string()).optional(),
    click: z.string().optional(),
    attachment: messageAttachmentSchema.optional(),
    expires: z.number().optional(),
})
    .catchall(z.unknown());
