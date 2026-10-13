import { z } from "zod";
import { validateIconUrl } from "../utils/validation.js";
/**
 * Optional notification icon link (X-Icon) (#27). Blank or whitespace-only
 * input counts as not provided. One string schema rather than a union, so
 * the model sees a plain string and a rejected link reports validateIconUrl's
 * fixed message.
 */
export function createOptionalIconUrlSchema(description) {
    return z
        .string()
        .superRefine((value, ctx) => {
        const url = value.trim();
        if (!url) {
            return;
        }
        try {
            validateIconUrl(url);
        }
        catch (error) {
            ctx.addIssue({
                code: "custom",
                message: error instanceof Error ? error.message : "Invalid icon url",
            });
        }
    })
        .optional()
        .transform((value) => {
        const trimmedValue = value?.trim();
        return trimmedValue ? trimmedValue : undefined;
    })
        .describe(description);
}
