import { z } from "zod";
import { validateNtfyUrl } from "../utils/validation.js";

export const viewActionSchema = z.object({
    action: z.literal("view"),
    label: z.string(),
    url: z.string().superRefine((url, ctx) => {
        try {
            validateNtfyUrl(url, "action url");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Invalid action url";
            ctx.addIssue({ code: "custom", message });
        }
    }),
    clear: z.boolean().optional(),
});

export type ViewAction = z.infer<typeof viewActionSchema>;
