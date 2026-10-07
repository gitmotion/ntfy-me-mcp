import { z } from "zod";
import { validateActionUrl } from "../utils/validation.js";
export const viewActionSchema = z.object({
    action: z.literal("view"),
    label: z.string(),
    url: z.string().superRefine((url, ctx) => {
        try {
            validateActionUrl(url);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Invalid action url";
            ctx.addIssue({ code: "custom", message });
        }
    }),
    clear: z.boolean().optional(),
});
