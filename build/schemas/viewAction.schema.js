import { z } from "zod";
export const viewActionSchema = z.object({
    action: z.literal("view"),
    label: z.string(),
    url: z.string(),
    clear: z.boolean().optional(),
});
