import { z } from "zod";
export const NTFY_PRIORITIES = [
    "min",
    "low",
    "default",
    "high",
    "max",
];
const NTFY_TOOL_INPUT_PRIORITIES = [
    "min",
    "low",
    "default",
    "high",
    "max",
    "",
];
export const ntfyPrioritySchema = z.enum(NTFY_PRIORITIES);
const ntfyToolInputPrioritySchema = z.enum(NTFY_TOOL_INPUT_PRIORITIES);
export function createOptionalDefaultedNtfyPrioritySchema(description) {
    return ntfyToolInputPrioritySchema
        .optional()
        .default("default")
        .transform((value) => value === "" ? "default" : value)
        .describe(description);
}
export function createOptionalNtfyPrioritiesSchema(description) {
    return z
        .union([
        ntfyToolInputPrioritySchema,
        z.array(ntfyToolInputPrioritySchema),
    ])
        .optional()
        .transform((value) => {
        if (value === undefined || value === "") {
            return undefined;
        }
        if (Array.isArray(value)) {
            const normalizedPriorities = value.filter((priority) => priority !== "");
            return normalizedPriorities.length > 0
                ? normalizedPriorities
                : undefined;
        }
        return value;
    })
        .describe(description);
}
