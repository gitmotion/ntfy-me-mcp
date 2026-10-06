import { describe, expect, it } from "vitest";
import { createFetchToolInputSchema } from "../src/schemas/fetchTool.schema.js";
import { createNotifyToolInputSchema } from "../src/schemas/notifyTool.schema.js";

describe("tool input schemas and topic overrides (#21)", () => {
    it("omits topic from ntfy_me when overrides are not allowed", () => {
        const schema = createNotifyToolInputSchema({ allowTopicOverride: false });

        expect(Object.keys(schema.shape)).not.toContain("topic");
        expect(
            schema.parse({ title: "T", message: "m", topic: "agent_picked_topic" })
        ).not.toHaveProperty("topic");
    });

    it("exposes topic on ntfy_me when overrides are allowed", () => {
        const schema = createNotifyToolInputSchema({ allowTopicOverride: true });

        expect(Object.keys(schema.shape)).toContain("topic");
        expect(
            schema.parse({ title: "T", message: "m", topic: "agent_picked_topic" })
        ).toMatchObject({ topic: "agent_picked_topic" });
    });

    it("omits topic from ntfy_me_fetch when overrides are not allowed", () => {
        const schema = createFetchToolInputSchema({ allowTopicOverride: false });

        expect(Object.keys(schema.shape)).not.toContain("topic");
        expect(schema.parse({ topic: "agent_picked_topic" })).not.toHaveProperty("topic");
    });

    it("exposes topic on ntfy_me_fetch when overrides are allowed", () => {
        const schema = createFetchToolInputSchema({ allowTopicOverride: true });

        expect(Object.keys(schema.shape)).toContain("topic");
        expect(schema.parse({ topic: "agent_picked_topic" })).toMatchObject({
            topic: "agent_picked_topic",
        });
    });

    it("tells the agent that NTFY_TOKEN is only sent to NTFY_URL", () => {
        for (const schema of [
            createNotifyToolInputSchema({ allowTopicOverride: false }),
            createFetchToolInputSchema({ allowTopicOverride: false }),
        ]) {
            expect(schema.shape.url.description).toMatch(/NTFY_TOKEN is only sent to NTFY_URL/);
        }
    });
});
