import { describe, expect, it } from "vitest";
import { toolHandlerConfigSchema } from "../src/schemas/toolHandlerConfig.schema.js";

describe("toolHandlerConfigSchema", () => {
    it("accepts valid handler config functions", () => {
        const parsed = toolHandlerConfigSchema.parse({
            getDefaultTopic: () => "topic_name",
            getDefaultUrl: () => "https://ntfy.sh",
            getDefaultToken: () => "secret-token",
        });

        expect(parsed.getDefaultTopic?.()).toBe("topic_name");
        expect(parsed.getDefaultUrl?.()).toBe("https://ntfy.sh");
        expect(parsed.getDefaultToken?.()).toBe("secret-token");
    });

    it("accepts omitted config values", () => {
        expect(toolHandlerConfigSchema.parse({})).toEqual({});
    });

    it("rejects non-function config values", () => {
        expect(() =>
            toolHandlerConfigSchema.parse({
                getDefaultUrl: "https://ntfy.sh",
            })
        ).toThrow();
    });
});