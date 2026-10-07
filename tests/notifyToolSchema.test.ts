import { describe, expect, it } from "vitest";
import { notifyToolInputSchema } from "../src/schemas/notifyTool.schema.js";

const baseNotifyInput = {
    title: "Test",
    message: "Hello",
};

function buildAction(index: number) {
    return {
        action: "view" as const,
        label: `Action ${index}`,
        url: `https://example.com/${index}`,
    };
}

describe("notifyToolInputSchema actions", () => {
    it("accepts up to three view actions", () => {
        expect(
            notifyToolInputSchema.parse({
                ...baseNotifyInput,
                actions: [buildAction(1), buildAction(2), buildAction(3)],
            })
        ).toMatchObject({
            actions: [
                { url: "https://example.com/1" },
                { url: "https://example.com/2" },
                { url: "https://example.com/3" },
            ],
        });
    });

    it("rejects more than three view actions", () => {
        expect(() =>
            notifyToolInputSchema.parse({
                ...baseNotifyInput,
                actions: [
                    buildAction(1),
                    buildAction(2),
                    buildAction(3),
                    buildAction(4),
                ],
            })
        ).toThrow(/At most 3 view actions/);
    });

    it("rejects non-http(s) action urls", () => {
        expect(() =>
            notifyToolInputSchema.parse({
                ...baseNotifyInput,
                actions: [
                    {
                        action: "view",
                        label: "x",
                        url: "javascript:alert(1)",
                    },
                ],
            })
        ).toThrow(/action url/);
    });
});
