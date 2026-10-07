import { createServer, type IncomingHttpHeaders } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, inject, it } from "vitest";
import { callTool, connect, type McpSession, pollTopic, uniqueTopic } from "./helpers.js";

const ntfyUrl = inject("ntfyUrl");
const authNtfyUrl = inject("authNtfyUrl");
const authToken = inject("authToken");

describe("destination control (#21, #34) against real ntfy servers", () => {
    let session: McpSession | undefined;

    afterEach(async () => {
        // Close first: stdout is parsed until the server exits, and it must
        // have carried only JSON-RPC for the whole session.
        const current = session;
        session = undefined;
        await current?.close();
        expect(current?.errors ?? []).toEqual([]);
    });

    it("by default offers no topic or url, and a stray one still lands on NTFY_TOPIC", async () => {
        const topic = uniqueTopic("e2e_locked");
        const other = uniqueTopic("e2e_other");
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const { tools } = await session.client.listTools();
        for (const tool of tools) {
            expect(Object.keys(tool.inputSchema.properties ?? {})).not.toContain("topic");
            expect(Object.keys(tool.inputSchema.properties ?? {})).not.toContain("url");
        }
        await callTool(session, "ntfy_me", { title: "T", message: "m", topic: other, url: "http://127.0.0.1:9" });

        expect(await pollTopic(ntfyUrl, topic)).toHaveLength(1);
        expect(await pollTopic(ntfyUrl, other)).toEqual([]);
    });

    it("with NTFY_TOPICS_ALLOWLIST, sends to an allowlisted topic and rejects any other", async () => {
        const main = uniqueTopic("e2e_main");
        const alerts = uniqueTopic("e2e_alerts");
        const unfollowed = uniqueTopic("e2e_unfollowed");
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: main, NTFY_TOPICS_ALLOWLIST: alerts });

        const { tools } = await session.client.listTools();
        for (const tool of tools) {
            expect((tool.inputSchema.properties?.topic as { enum?: string[] }).enum).toEqual([main, alerts]);
        }
        const allowed = await callTool(session, "ntfy_me", { title: "Alert", message: "m", topic: alerts });
        const rejected = await callTool(session, "ntfy_me", { title: "Nope", message: "m", topic: unfollowed });

        expect(allowed.isError).toBeFalsy();
        expect(rejected.isError).toBe(true);
        expect(rejected.content[0].text).toMatch(/^MCP error -32602/);
        expect(await pollTopic(ntfyUrl, alerts)).toHaveLength(1);
        expect(await pollTopic(ntfyUrl, unfollowed)).toEqual([]);
        expect(await pollTopic(ntfyUrl, main)).toEqual([]);
    });

    it("never sends NTFY_TOKEN to a server other than NTFY_URL, even with url overrides on", async () => {
        const seen: IncomingHttpHeaders[] = [];
        const foreign = createServer((request, response) => {
            seen.push(request.headers);
            request.resume();
            response.writeHead(200, { "content-type": "application/json" }).end("{}");
        });
        await new Promise<void>((resolve) => foreign.listen(0, "127.0.0.1", resolve));
        const foreignUrl = `http://127.0.0.1:${(foreign.address() as AddressInfo).port}`;

        try {
            const topic = uniqueTopic("e2e_origin");
            session = await connect({
                NTFY_URL: authNtfyUrl,
                NTFY_TOPIC: topic,
                NTFY_TOKEN: authToken,
                NTFY_ALLOW_URL_OVERRIDE: "true",
            });

            await callTool(session, "ntfy_me", { title: "Elsewhere", message: "m", url: foreignUrl });
            const home = await callTool(session, "ntfy_me", { title: "Home", message: "m" });

            expect(seen).toHaveLength(1);
            expect(seen[0].authorization).toBeUndefined();
            expect(home.isError).toBeFalsy();
            expect(await pollTopic(authNtfyUrl, topic, authToken)).toEqual([expect.objectContaining({ title: "Home" })]);
        } finally {
            await new Promise<void>((resolve) => foreign.close(() => resolve()));
        }
    });
});
