import { z } from "zod";
import { validateAttachUrl } from "../utils/validation.js";

/**
 * Optional attachment URL (X-Attach) for external images/files (#27).
 * Blank or whitespace-only input counts as explicitly disabling auto-attachment
 * (returns ""). One string schema rather than a union, so the model sees a plain
 * string and a rejected link reports validateAttachUrl's fixed message.
 */
export function createOptionalAttachUrlSchema(description: string) {
    return z
        .string()
        .superRefine((value, ctx) => {
            const url = value.trim();
            if (!url) {
                return;
            }

            try {
                validateAttachUrl(url);
            } catch (error) {
                ctx.addIssue({
                    code: "custom",
                    message: error instanceof Error ? error.message : "Invalid attach url",
                });
            }
        })
        .optional()
        .transform((value) => {
            if (value === undefined) {
                return undefined;
            }

            return value.trim();
        })
        .describe(description);
}
