import { z } from "zod";

export const NTFY_PRIORITIES = [
    "min",
    "low",
    "default",
    "high",
    "max",
] as const;

const NTFY_TOOL_INPUT_PRIORITIES = [
    "min",
    "low",
    "default",
    "high",
    "max",
    "",
] as const;

export const ntfyPrioritySchema = z.enum(NTFY_PRIORITIES);

const ntfyToolInputPrioritySchema = z.enum(NTFY_TOOL_INPUT_PRIORITIES);

export type NtfyPriority = z.infer<typeof ntfyPrioritySchema>;
export type NtfyPriorities = NtfyPriority | NtfyPriority[];

export function createOptionalDefaultedNtfyPrioritySchema(description: string) {
    return ntfyToolInputPrioritySchema
        .optional()
        .default("default")
        .transform((value): NtfyPriority =>
            value === "" ? "default" : value
        )
        .describe(description);
}

export function createOptionalNtfyPrioritiesSchema(description: string) {
    return z
        .union([
            ntfyToolInputPrioritySchema,
            z.array(ntfyToolInputPrioritySchema),
        ])
        .optional()
        .transform((value): NtfyPriorities | undefined => {
            if (value === undefined || value === "") {
                return undefined;
            }

            if (Array.isArray(value)) {
                const normalizedPriorities = value.filter(
                    (priority): priority is NtfyPriority => priority !== ""
                );

                return normalizedPriorities.length > 0
                    ? normalizedPriorities
                    : undefined;
            }

            return value;
        })
        .describe(description);
}