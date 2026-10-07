import { z } from "zod";
import { validateClickUrl } from "../utils/validation.js";

/**
 * Optional click link (X-Click) ntfy opens when the notification is tapped
 * (#26). Blank or whitespace-only input counts as not provided (agents often
 * send ""). One string schema rather than a union, so the model sees a plain
 * string and a rejected link reports validateClickUrl's fixed message.
 */
export function createOptionalClickUrlSchema(description: string) {
    return z
        .string()
        .superRefine((value, ctx) => {
            const url = value.trim();
            if (!url) {
                return;
            }

            try {
                validateClickUrl(url);
            } catch (error) {
                ctx.addIssue({
                    code: "custom",
                    message: error instanceof Error ? error.message : "Invalid click url",
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
