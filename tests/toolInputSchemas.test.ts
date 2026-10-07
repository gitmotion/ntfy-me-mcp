import { describe, expect, it } from "vitest";
import { createFetchToolInputSchema } from "../src/schemas/fetchTool.schema.js";
import { createNotifyToolInputSchema } from "../src/schemas/notifyTool.schema.js";

const LOCKED = { allowTopicOverride: false, allowUrlOverride: false };

// The factories' static type is the most restricted shape (see their doc
// comments); which keys exist at runtime depends on the policy.
function shapeOf(schema: { shape: object }) {
    return schema.shape as Record<string, { description?: string }>;
}

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
            expect(shapeOf(schema).url.description).toMatch(/NTFY_TOKEN is only sent to NTFY_URL/);
        }
    });

    describe("topic allowlist (#34)", () => {
        const ALLOWLIST = { allowTopicOverride: false, allowUrlOverride: false, allowedTopics: ["default_topic", "alerts"] };

        it.each([
            ["ntfy_me", createNotifyToolInputSchema, { title: "T", message: "m" }],
            ["ntfy_me_fetch", createFetchToolInputSchema, {}],
        ] as const)("%s offers topic, limited to the allowed topics", (_name, create, base) => {
            const schema = create(ALLOWLIST);

            expect(Object.keys(schema.shape)).toContain("topic");
            expect(Object.keys(schema.shape)).not.toContain("url");
            expect(schema.parse({ ...base, topic: "alerts" })).toMatchObject({ topic: "alerts" });
            expect(schema.parse({ ...base, topic: " alerts " })).toMatchObject({ topic: "alerts" });
            expect(schema.safeParse({ ...base, topic: "agent_picked_topic" }).success).toBe(false);
            for (const topic of [null, 123, ["alerts"], "Alerts"]) {
                expect(schema.safeParse({ ...base, topic }).success).toBe(false);
            }
        });

        it.each([
            ["ntfy_me", createNotifyToolInputSchema, { title: "T", message: "m" }],
            ["ntfy_me_fetch", createFetchToolInputSchema, {}],
        ] as const)("%s treats a blank or missing topic as the default", (_name, create, base) => {
            const schema = create(ALLOWLIST);

            for (const topic of ["", "   ", undefined]) {
                expect((schema.parse({ ...base, topic }) as { topic?: string }).topic).toBeUndefined();
            }
        });

        it.each([
            ["ntfy_me", createNotifyToolInputSchema, { title: "T", message: "m" }],
            ["ntfy_me_fetch", createFetchToolInputSchema, {}],
        ] as const)("%s keeps the allowlist when allowTopicOverride is also set", (_name, create, base) => {
            const schema = create({ ...ALLOWLIST, allowTopicOverride: true });

            expect(schema.safeParse({ ...base, topic: "agent_picked_topic" }).success).toBe(false);
        });

        it("lists the allowed topics in the topic description", () => {
            for (const schema of [createNotifyToolInputSchema(ALLOWLIST), createFetchToolInputSchema(ALLOWLIST)]) {
                expect(shapeOf(schema).topic.description).toContain("One of: default_topic, alerts.");
                expect(shapeOf(schema).topic.description).toContain("Defaults to default_topic (NTFY_TOPIC)");
            }
        });

        it.each([[undefined], [[]]])("an allowlist of %j keeps the #21 behaviour", (allowedTopics) => {
            const schema = createNotifyToolInputSchema({ allowTopicOverride: false, allowUrlOverride: false, allowedTopics });

            expect(Object.keys(schema.shape)).not.toContain("topic");
        });
    });
});
