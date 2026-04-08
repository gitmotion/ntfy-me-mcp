import { z } from "zod";

export const toolHandlerConfigSchema = z.object({
    getDefaultTopic: z
        .function({
            input: [],
            output: z.union([z.string(), z.undefined()]),
        })
        .optional(),
    getDefaultUrl: z
        .function({
            input: [],
            output: z.string(),
        })
        .optional(),
    getDefaultToken: z
        .function({
            input: [],
            output: z.union([z.string(), z.undefined()]),
        })
        .optional(),
});

export type ToolHandlerConfig = z.infer<typeof toolHandlerConfigSchema>;