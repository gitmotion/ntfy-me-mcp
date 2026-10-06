import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

function buildHandlers(overrides: Partial<Parameters<typeof createToolHandlers>[0]> = {}) {
    return createToolHandlers({
        getDefaultTopic: () => "default_topic",
        getDefaultUrl: () => "https://ntfy.sh",
        getDefaultToken: () => "env-token",
        ...overrides,
    });
}

describe("createToolHandlers (#18)", () => {
    const mockFetchMessages = vi.mocked(fetchMessages);

    beforeEach(() => {
        mockFetch.mockReset();
        mockFetchMessages.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
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
        });
    });

    describe("secrets never reach the stderr log (#18 review)", () => {
        it("rejects an access token with control characters before building the request", async () => {
            const errorSpy = vi.spyOn(Logger.getInstance(), "error").mockImplementation(() => {});

            const { handleNotifyTool } = buildHandlers({ getDefaultToken: () => "sk_SECRET\nX" });
            const result = await handleNotifyTool({
                title: "T",
                message: "m",
                topic: undefined,
                priority: "default",
            });

            expect(result.structuredContent).toEqual({
                success: false,
                error: "Invalid access token: it may only contain printable ASCII characters without spaces.",
            });
            expect(mockFetch).not.toHaveBeenCalled();
            expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("sk_SECRET");
        });

        it("rejects URLs that embed credentials, and doesn't log them", async () => {
            const errorSpy = vi.spyOn(Logger.getInstance(), "error").mockImplementation(() => {});

            const { handleNotifyTool } = buildHandlers({
                getDefaultUrl: () => "https://admin:hunter2@ntfy.example.com",
            });
            const result = await handleNotifyTool({
                title: "T",
                message: "m",
                topic: undefined,
                priority: "default",
            });

            expect(result.structuredContent.error).toMatch(/^Invalid url: credentials in the URL are not supported/);
            expect(mockFetch).not.toHaveBeenCalled();
            expect(errorSpy.mock.calls.flat().join(" ")).not.toContain("hunter2");
        });

        it("redacts bearer values and URL credentials from logged errors", async () => {
            const errorSpy = vi.spyOn(Logger.getInstance(), "error").mockImplementation(() => {});
            mockFetch.mockRejectedValueOnce(
                new TypeError(
                    'Headers.append: "Bearer sk_SECRET value" is an invalid header value. See https://user:pw@host/x'
                )
            );

            const { handleNotifyTool } = buildHandlers();
            await handleNotifyTool({ title: "T", message: "m", topic: undefined, priority: "default" });

            const logged = errorSpy.mock.calls.flat().join(" ");
            expect(logged).toContain("Bearer [REDACTED]");
            expect(logged).toContain("https://[REDACTED]@host/x");
            expect(logged).not.toContain("sk_SECRET");
            expect(logged).not.toContain("user:pw");
        });
    });
});
