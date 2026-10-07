import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import { callTool, connect, type McpSession, type NtfyMessage, publishDirect, uniqueTopic } from "./helpers.js";

const ntfyUrl = inject("ntfyUrl");

type FetchedTopics = Record<string, Array<{ id: string; title?: string; message: string; priority?: number; tags?: string[] }>>;

function fetchedTitles(result: { structuredContent?: Record<string, unknown> }): string[] {
    const topics = (result.structuredContent?.topics ?? {}) as FetchedTopics;
    return Object.values(topics)
        .flat()
        .map((message) => message.title ?? "")
        .sort();
}

describe("ntfy_me_fetch against a real ntfy server", () => {
    const topic = uniqueTopic("e2e_fetch");
    let deploy: NtfyMessage;
    let session: McpSession | undefined;

    beforeAll(async () => {
        await publishDirect(ntfyUrl, { topic, title: "routine", message: "nightly backup ok", priority: 2, tags: ["backup"] });
        deploy = await publishDirect(ntfyUrl, { topic, title: "🚀 deploy", message: "v1.5.0 is live", priority: 4, tags: ["deploy"] });
        await publishDirect(ntfyUrl, { topic, title: "outage", message: "api down", priority: 5, tags: ["fire", "deploy"] });
    });

    afterEach(async () => {
        expect(session?.errors ?? []).toEqual([]);
        await session?.close();
        session = undefined;
    });

    it("returns every cached message on NTFY_TOPIC", async () => {
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me_fetch", { since: "all" });

        expect(result.isError).toBeFalsy();
        expect(result.structuredContent?.messageCount).toBe(3);
        expect(fetchedTitles(result)).toEqual(["outage", "routine", "🚀 deploy"].sort());
    });

    it.each([
        ["priorities", { priorities: ["max"] }, ["outage"]],
        ["tags", { tags: ["deploy"] }, ["outage", "🚀 deploy"]],
        ["a non-ASCII title (#18)", { messageTitle: "🚀 deploy" }, ["🚀 deploy"]],
        ["message text", { messageText: "nightly backup ok" }, ["routine"]],
    ] as const)("filters by %s", async (_label, filters, expected) => {
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me_fetch", { since: "all", ...filters });

        expect(result.isError).toBeFalsy();
        expect(fetchedTitles(result)).toEqual([...expected].sort());
    });

    it("finds a message by its id", async () => {
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me_fetch", { since: "all", messageId: deploy.id });

        expect(fetchedTitles(result)).toEqual(["🚀 deploy"]);
    });

    it("honours since (only messages after a given message id)", async () => {
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me_fetch", { since: deploy.id });

        expect(fetchedTitles(result)).toEqual(["outage"]);
    });
});
