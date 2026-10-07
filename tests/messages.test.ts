import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMessages } from "../src/utils/messages.js";

// The network layer uses Node's native fetch (#18).
const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", mockFetch);

function createResponse({
    ok = true,
    status = 200,
    text = "",
}: {
    ok?: boolean;
    status?: number;
    text?: string;
} = {}): Response {
    return {
        ok,
        status,
        text: vi.fn().mockResolvedValue(text),
    } as unknown as Response;
}

describe("fetchMessages", () => {

    beforeEach(() => {
        mockFetch.mockReset();
    });

    it("builds the request with auth, since, and filter headers", async () => {
        mockFetch.mockResolvedValueOnce(
            createResponse({
                text: [
                    JSON.stringify({
                        id: "1",
                        time: 1,
                        event: "message",
                        topic: "alerts",
                        message: "first",
                    }),
                    JSON.stringify({
                        id: "2",
                        time: 2,
                        event: "message",
                        topic: "alerts",
                        message: "second",
                    }),
                ].join("\n"),
            })
        );

        const result = await fetchMessages({
            url: "https://ntfy.sh/",
            topic: "alerts",
            token: "secret-token",
            since: "2m",
            messageId: "msg-1",
            messageText: "first",
            messageTitle: "Deploy",
            priorities: ["high", "default"],
            tags: ["ops", "prod"],
        });

        expect(mockFetch).toHaveBeenCalledWith(
            "https://ntfy.sh/alerts/json?poll=1&since=2m",
            {
                headers: {
                    Authorization: "Bearer secret-token",
                    "X-ID": "msg-1",
                    "X-Message": "first",
                    "X-Title": "Deploy",
                    "X-Priority": "high,default",
                    "X-Tags": "ops,prod",
                },
            }
        );
        expect(result).toEqual({
            alerts: [
                {
                    id: "1",
                    time: 1,
                    event: "message",
                    topic: "alerts",
                    message: "first",
                },
                {
                    id: "2",
                    time: 2,
                    event: "message",
                    topic: "alerts",
                    message: "second",
                },
            ],
        });
    });

    it("RFC 2047-encodes non-ASCII filter values (#18)", async () => {
        mockFetch.mockResolvedValueOnce(createResponse({ text: "" }));

        await fetchMessages({
            url: "https://ntfy.sh",
            topic: "alerts",
            messageId: "id-🔔",
            messageTitle: "🔔 Build",
            messageText: "terminé",
            tags: ["🚀", "ok"],
        });

        const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
        const decode = (value: string) =>
            Buffer.from(/^=\?UTF-8\?B\?(.*)\?=$/.exec(value)?.[1] ?? "", "base64").toString("utf8");
        expect(decode(headers["X-ID"])).toBe("id-🔔");
        expect(decode(headers["X-Title"])).toBe("🔔 Build");
        expect(decode(headers["X-Message"])).toBe("terminé");
        expect(decode(headers["X-Tags"])).toBe("🚀,ok");
    });

    it("rejects an access token that can't be sent as a header, without calling fetch", async () => {
        await expect(
            fetchMessages({ url: "https://ntfy.sh", topic: "alerts", token: "sk_SECRET\nX" })
        ).rejects.toThrow(
            "Invalid access token: it may only contain printable ASCII characters without spaces."
        );
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("URL-encodes `since` so it can't inject extra query parameters", async () => {
        mockFetch.mockResolvedValueOnce(createResponse({ text: "" }));

        await fetchMessages({
            url: "https://ntfy.sh",
            topic: "alerts",
            since: "all&poll=0&scheduled=1",
        });

        const requested = new URL(String(mockFetch.mock.calls[0][0]));
        expect(requested.searchParams.getAll("poll")).toEqual(["1"]);
        expect(requested.searchParams.get("since")).toBe("all&poll=0&scheduled=1");
        expect(requested.searchParams.has("scheduled")).toBe(false);
    });

    it("returns null when the ntfy response body is empty", async () => {
        mockFetch.mockResolvedValueOnce(createResponse());

        await expect(
            fetchMessages({
                url: "https://ntfy.sh",
                topic: "alerts",
            })
        ).resolves.toBeNull();
    });

    it("skips invalid JSON lines and keeps valid messages", async () => {
        mockFetch.mockResolvedValueOnce(
            createResponse({
                text: [
                    JSON.stringify({
                        id: "1",
                        time: 1,
                        event: "message",
                        topic: "alerts",
                        message: "valid",
                    }),
                    "not-json",
                    JSON.stringify({
                        id: "2",
                        time: 2,
                        event: "message",
                        topic: "alerts",
                        message: "still valid",
                    }),
                ].join("\n"),
            })
        );

        const result = await fetchMessages({
            url: "https://ntfy.sh",
            topic: "alerts",
        });

        expect(result).toEqual({
            alerts: [
                {
                    id: "1",
                    time: 1,
                    event: "message",
                    topic: "alerts",
                    message: "valid",
                },
                {
                    id: "2",
                    time: 2,
                    event: "message",
                    topic: "alerts",
                    message: "still valid",
                },
            ],
        });
    });

    it("skips JSON lines that do not match the message schema", async () => {
        mockFetch.mockResolvedValueOnce(
            createResponse({
                text: [
                    JSON.stringify({
                        id: "1",
                        time: 1,
                        event: "message",
                        topic: "alerts",
                        message: "valid",
                    }),
                    JSON.stringify({
                        id: "broken",
                        event: "message",
                        topic: "alerts",
                    }),
                    JSON.stringify({
                        id: "2",
                        time: 2,
                        event: "message",
                        topic: "alerts",
                        message: "still valid",
                    }),
                ].join("\n"),
            })
        );

        const result = await fetchMessages({
            url: "https://ntfy.sh",
            topic: "alerts",
        });

        expect(result).toEqual({
            alerts: [
                {
                    id: "1",
                    time: 1,
                    event: "message",
                    topic: "alerts",
                    message: "valid",
                },
                {
                    id: "2",
                    time: 2,
                    event: "message",
                    topic: "alerts",
                    message: "still valid",
                },
            ],
        });
    });

    it("throws an authentication error for protected topics", async () => {
        mockFetch.mockResolvedValueOnce(createResponse({ ok: false, status: 401 }));

        await expect(
            fetchMessages({
                url: "https://ntfy.sh",
                topic: "alerts",
            })
        ).rejects.toThrow(/Authentication failed when fetching messages/);
    });

    it("validates URL and topic before issuing the request", async () => {
        await expect(
            fetchMessages({
                url: "ftp://ntfy.sh",
                topic: "alerts",
            })
        ).rejects.toThrow(/Invalid url:/);

        await expect(
            fetchMessages({
                url: "https://ntfy.sh",
                topic: "topic.with.dots",
            })
        ).rejects.toThrow(/Invalid topic:/);

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rejects malformed runtime fetch options before issuing the request", async () => {
        await expect(
            fetchMessages({
                url: "https://ntfy.sh",
                topic: "alerts",
                priorities: 3 as unknown as Parameters<typeof fetchMessages>[0]["priorities"],
            })
        ).rejects.toThrow();

        expect(mockFetch).not.toHaveBeenCalled();
    });
});