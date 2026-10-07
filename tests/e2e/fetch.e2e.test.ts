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
    // Published in this order: routine, deploy, outage, French.
    let session: McpSession | undefined;

    beforeAll(async () => {
        await publishDirect(ntfyUrl, { topic, title: "routine", message: "nightly backup ok", priority: 2, tags: ["backup"] });
        deploy = await publishDirect(ntfyUrl, { topic, title: "🚀 deploy", message: "v1.5.0 is live", priority: 4, tags: ["deploy"] });
        await publishDirect(ntfyUrl, { topic, title: "outage", message: "api down", priority: 5, tags: ["fire", "deploy"] });
        await publishDirect(ntfyUrl, { topic, title: "French", message: "mise en production", priority: 3, tags: ["déploiement"] });
    });

    afterEach(async () => {
        // Close first: stdout is parsed until the server exits, and it must
        // have carried only JSON-RPC for the whole session.
        const current = session;
        session = undefined;
        await current?.close();
        expect(current?.errors ?? []).toEqual([]);
    });

    it("returns every cached message on NTFY_TOPIC", async () => {
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me_fetch", { since: "all" });

        expect(result.isError).toBeFalsy();
        expect(result.structuredContent?.messageCount).toBe(4);
        expect(fetchedTitles(result)).toEqual(["French", "outage", "routine", "🚀 deploy"].sort());
    });

    it.each([
        ["priorities", { priorities: ["max"] }, ["outage"]],
        ["two priorities", { priorities: ["max", "low"] }, ["outage", "routine"]],
        ["tags", { tags: ["deploy"] }, ["outage", "🚀 deploy"]],
        ["two tags (all must match)", { tags: ["deploy", "fire"] }, ["outage"]],
        ["a non-ASCII tag (#18)", { tags: ["déploiement"] }, ["French"]],
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

        expect(fetchedTitles(result)).toEqual(["French", "outage"]);
    });
});
