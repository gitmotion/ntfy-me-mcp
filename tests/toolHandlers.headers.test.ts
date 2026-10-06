import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMessages } from "../src/utils/messages.js";
import { Logger } from "../src/utils/logger.js";
import { createToolHandlers } from "../src/utils/toolHandlers.js";

// Header encoding and error diagnostics for the tool handlers (#18).
const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../src/utils/messages.js", () => ({
    fetchMessages: vi.fn(),
}));

function createResponse({ ok = true, status = 200 }: { ok?: boolean; status?: number } = {}): Response {
    return { ok, status } as Response;
}

function buildHandlers() {
    return createToolHandlers({
        getDefaultTopic: () => "default_topic",
        getDefaultUrl: () => "https://ntfy.sh",
        getDefaultToken: () => "env-token",
    });
}

describe("createToolHandlers (#18)", () => {
    const mockFetchMessages = vi.mocked(fetchMessages);

    beforeEach(() => {
        mockFetch.mockReset();
        mockFetchMessages.mockReset();
    });

    describe("non-ASCII header values (#18)", () => {
        const decode = (value: string) =>
            Buffer.from(/^=\?UTF-8\?B\?(.*)\?=$/.exec(value)?.[1] ?? "", "base64").toString("utf8");

        it("RFC 2047-encodes an emoji title instead of failing before the request", async () => {
            mockFetch.mockResolvedValueOnce(createResponse());

            const { handleNotifyTool } = buildHandlers();
            const result = await handleNotifyTool({
                title: "🔔 Test",
                message: "Hello 🎉",
                topic: undefined,
                priority: "default",
            });

            expect(result.isError).toBeUndefined();
            const [, options] = mockFetch.mock.calls[0];
            const headers = options?.headers as Record<string, string>;
            expect(headers.Title).toMatch(/^=\?UTF-8\?B\?/);
            expect(decode(headers.Title)).toBe("🔔 Test");
            expect(options?.body).toBe("Hello 🎉");
        });

        it("encodes non-ASCII tags and action labels", async () => {
            mockFetch.mockResolvedValueOnce(createResponse());

            const { handleNotifyTool } = buildHandlers();
            await handleNotifyTool({
                title: "ok",
                message: "plain",
                topic: undefined,
                priority: "default",
                tags: ["déploiement", "ok"],
                actions: [{ action: "view", label: "Öffnen 🚀", url: "https://example.com" }],
            });

            const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
            expect(decode(headers.Tags)).toBe("déploiement,ok");
            expect(JSON.parse(decode(headers["X-Actions"]))).toEqual([
                { action: "view", label: "Öffnen 🚀", url: "https://example.com" },
            ]);
            expect(headers.Title).toBe("ok");
        });
    });

    describe("network failure diagnostics (#18)", () => {
        function connectionRefused(): TypeError {
            return new TypeError("fetch failed", {
                cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:9"), {
                    code: "ECONNREFUSED",
                }),
            });
        }

        it("reports an actionable, sanitized message when the server can't be reached", async () => {
            mockFetch.mockRejectedValueOnce(connectionRefused());

            const { handleNotifyTool } = buildHandlers();
            const result = await handleNotifyTool({
                title: "T",
                message: "m",
                topic: undefined,
                priority: "default",
            });

            expect(result.structuredContent).toEqual({
                success: false,
                error: "Failed to send ntfy notification: could not connect to the ntfy server (ECONNREFUSED)",
            });
        });

        it("logs the underlying error to stderr before sanitizing it", async () => {
            const errorSpy = vi.spyOn(Logger.getInstance(), "error").mockImplementation(() => {});
            mockFetch.mockRejectedValueOnce(new TypeError("Cannot convert argument to a ByteString"));

            const { handleNotifyTool } = buildHandlers();
            const result = await handleNotifyTool({
                title: "T",
                message: "m",
                topic: undefined,
                priority: "default",
            });

            expect(result.structuredContent).toEqual({
                success: false,
                error: "Failed to send ntfy notification",
            });
            expect(errorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Cannot convert argument to a ByteString")
            );
            errorSpy.mockRestore();
        });

        it("logs fetch-tool failures to stderr too", async () => {
            const errorSpy = vi.spyOn(Logger.getInstance(), "error").mockImplementation(() => {});
            mockFetchMessages.mockRejectedValueOnce(connectionRefused());

            const { handleFetchTool } = buildHandlers();
            const result = await handleFetchTool({ topic: undefined, priorities: undefined });

            expect(result.structuredContent).toEqual({
                success: false,
                error: "Failed to fetch ntfy messages: could not connect to the ntfy server (ECONNREFUSED)",
            });
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ECONNREFUSED"));
            errorSpy.mockRestore();
        });
    });
});
