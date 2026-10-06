import { describe, expect, it } from "vitest";
import { createFetchToolInputSchema } from "../src/schemas/fetchTool.schema.js";
import { createNotifyToolInputSchema } from "../src/schemas/notifyTool.schema.js";

const LOCKED = { allowTopicOverride: false, allowUrlOverride: false };

describe("tool input schemas and destination overrides (#21)", () => {
    it.each([
        ["ntfy_me", createNotifyToolInputSchema, { title: "T", message: "m" }],
        ["ntfy_me_fetch", createFetchToolInputSchema, {}],
    ] as const)("%s omits topic and url by default and strips them if sent", (_name, create, base) => {
        const schema = create(LOCKED);

        expect(Object.keys(schema.shape)).not.toContain("topic");
        expect(Object.keys(schema.shape)).not.toContain("url");
        const parsed = schema.parse({ ...base, topic: "agent_picked_topic", url: "https://evil.example.com" });
        expect(parsed).not.toHaveProperty("topic");
        expect(parsed).not.toHaveProperty("url");
    });

    it.each([
        ["ntfy_me", createNotifyToolInputSchema, { title: "T", message: "m" }],
        ["ntfy_me_fetch", createFetchToolInputSchema, {}],
    ] as const)("%s exposes only topic when allowTopicOverride is set", (_name, create, base) => {
        const schema = create({ allowTopicOverride: true, allowUrlOverride: false });

        expect(Object.keys(schema.shape)).toContain("topic");
        expect(Object.keys(schema.shape)).not.toContain("url");
        expect(schema.parse({ ...base, topic: "agent_picked_topic" })).toMatchObject({
            topic: "agent_picked_topic",
        });
    });

    it.each([
        ["ntfy_me", createNotifyToolInputSchema, { title: "T", message: "m" }],
        ["ntfy_me_fetch", createFetchToolInputSchema, {}],
    ] as const)("%s exposes only url when allowUrlOverride is set", (_name, create, base) => {
        const schema = create({ allowTopicOverride: false, allowUrlOverride: true });

        expect(Object.keys(schema.shape)).toContain("url");
        expect(Object.keys(schema.shape)).not.toContain("topic");
        expect(schema.parse({ ...base, url: "https://ntfy.example.com" })).toMatchObject({
            url: "https://ntfy.example.com",
        });
    });

    it("tells the agent that NTFY_TOKEN is only sent to NTFY_URL when url is offered", () => {
        const open = { allowTopicOverride: true, allowUrlOverride: true };
        for (const schema of [createNotifyToolInputSchema(open), createFetchToolInputSchema(open)]) {
            expect(schema.shape.url.description).toMatch(/NTFY_TOKEN is only sent to NTFY_URL/);
        }
    });
});
