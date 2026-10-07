import { afterEach, describe, expect, inject, it } from "vitest";
import { callTool, connect, type McpSession, pollTopic, uniqueTopic } from "./helpers.js";

const ntfyUrl = inject("ntfyUrl");

describe("ntfy_me against a real ntfy server", () => {
    let session: McpSession | undefined;

    afterEach(async () => {
        // stdout must carry only JSON-RPC for the whole session.
        expect(session?.errors ?? []).toEqual([]);
        await session?.close();
        session = undefined;
    });

    it("publishes title, message, priority and tags", async () => {
        const topic = uniqueTopic("e2e_notify");
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me", {
            title: "Build finished",
            message: "All checks passed",
            priority: "high",
            tags: ["white_check_mark", "ci"],
        });

        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toBe(`Notification sent successfully to ${ntfyUrl}/${topic}!`);
        const [message, ...rest] = await pollTopic(ntfyUrl, topic);
        expect(rest).toEqual([]);
        expect(message).toMatchObject({
            title: "Build finished",
            message: "All checks passed",
            priority: 4,
            tags: ["white_check_mark", "ci"],
        });
    });

    it("delivers non-ASCII title, message, tags and action labels intact (#18)", async () => {
        const topic = uniqueTopic("e2e_unicode");
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me", {
            title: "🔔 Déploiement terminé ✅",
            message: "Café crème 🎉 — 完了",
            tags: ["tada", "déploiement"],
            actions: [{ action: "view", label: "Ouvrir 📄", url: "https://example.com/run/1" }],
        });

        expect(result.isError).toBeFalsy();
        const [message] = await pollTopic(ntfyUrl, topic);
        expect(message.title).toBe("🔔 Déploiement terminé ✅");
        expect(message.message).toBe("Café crème 🎉 — 完了");
        expect(message.tags).toEqual(["tada", "déploiement"]);
        expect(message.actions?.[0]).toMatchObject({
            action: "view",
            label: "Ouvrir 📄",
            url: "https://example.com/run/1",
        });
    });

    it("sends markdown and turns URLs in the message into view actions", async () => {
        const topic = uniqueTopic("e2e_markdown");
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        await callTool(session, "ntfy_me", {
            title: "Release notes",
            message: "## v1.5.0\n\n- **topic lock**\n- emoji headers\n\nDetails: https://example.com/releases/1.5.0",
        });

        const [message] = await pollTopic(ntfyUrl, topic);
        expect(message.content_type).toBe("text/markdown");
        expect(message.actions).toEqual([
            expect.objectContaining({ action: "view", url: "https://example.com/releases/1.5.0" }),
        ]);
    });

    it("rejects invalid arguments with an MCP validation error and sends nothing", async () => {
        const topic = uniqueTopic("e2e_invalid");
        session = await connect({ NTFY_URL: ntfyUrl, NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me", { message: "missing title", priority: "urgent" });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/^MCP error -32602: Input validation error/);
        expect(result.content[0].text).not.toContain("missing title");
        expect(await pollTopic(ntfyUrl, topic)).toEqual([]);
    });

    it("reports a server that refuses the connection without leaking details", async () => {
        const topic = uniqueTopic("e2e_down");
        session = await connect({ NTFY_URL: "http://127.0.0.1:9", NTFY_TOPIC: topic });

        const result = await callTool(session, "ntfy_me", { title: "T", message: "m" });

        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({ success: false });
        expect(session.stderr()).toContain("Failed to send ntfy notification");
    });
});
