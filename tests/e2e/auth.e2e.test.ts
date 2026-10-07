import { afterEach, describe, expect, inject, it } from "vitest";
import { callTool, connect, type McpSession, pollTopic, uniqueTopic } from "./helpers.js";

// This ntfy server denies all anonymous access (NTFY_AUTH_DEFAULT_ACCESS=deny-all).
const authNtfyUrl = inject("authNtfyUrl");
const authToken = inject("authToken");

describe("authentication against a deny-all ntfy server", () => {
    let session: McpSession | undefined;

    afterEach(async () => {
        expect(session?.errors ?? []).toEqual([]);
        await session?.close();
        session = undefined;
    });

    it("publishes and fetches with NTFY_TOKEN, and never logs the token", async () => {
        const topic = uniqueTopic("e2e_auth");
        session = await connect({ NTFY_URL: authNtfyUrl, NTFY_TOPIC: topic, NTFY_TOKEN: authToken });

        const sent = await callTool(session, "ntfy_me", { title: "Protected", message: "with a token" });
        const fetched = await callTool(session, "ntfy_me_fetch", { since: "all" });

        expect(sent.isError).toBeFalsy();
        expect(fetched.isError).toBeFalsy();
        expect(fetched.structuredContent?.messageCount).toBe(1);
        expect(await pollTopic(authNtfyUrl, topic, authToken)).toEqual([
            expect.objectContaining({ title: "Protected", message: "with a token" }),
        ]);
        expect(session.stderr()).not.toContain(authToken);
    });

    it("returns the authentication error without a token, for both tools", async () => {
        const topic = uniqueTopic("e2e_noauth");
        session = await connect({ NTFY_URL: authNtfyUrl, NTFY_TOPIC: topic });

        const sent = await callTool(session, "ntfy_me", { title: "T", message: "m" });
        const fetched = await callTool(session, "ntfy_me_fetch", { since: "all" });

        expect(sent.isError).toBe(true);
        expect(sent.structuredContent?.error).toMatch(/^Authentication failed when sending notification\./);
        expect(fetched.isError).toBe(true);
        expect(fetched.structuredContent?.error).toMatch(/^Authentication failed when fetching messages\./);
        expect(await pollTopic(authNtfyUrl, topic, authToken)).toEqual([]);
    });

    it("uses a per-call accessToken when NTFY_TOKEN isn't set", async () => {
        const topic = uniqueTopic("e2e_calltoken");
        session = await connect({ NTFY_URL: authNtfyUrl, NTFY_TOPIC: topic });

        const sent = await callTool(session, "ntfy_me", { title: "Per call", message: "m", accessToken: authToken });

        expect(sent.isError).toBeFalsy();
        expect(await pollTopic(authNtfyUrl, topic, authToken)).toHaveLength(1);
    });
});
