import { beforeEach, describe, expect, it, vi } from "vitest";
import fetch, { type Response } from "node-fetch";
import { fetchMessages } from "../src/utils/messages.js";

vi.mock("node-fetch", () => ({
    default: vi.fn(),
}));

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
    const mockFetch = vi.mocked(fetch);

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
            ntfyUrl: "https://ntfy.sh/",
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

    it("returns null when the ntfy response body is empty", async () => {
        mockFetch.mockResolvedValueOnce(createResponse());

        await expect(
            fetchMessages({
                ntfyUrl: "https://ntfy.sh",
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
            ntfyUrl: "https://ntfy.sh",
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
            ntfyUrl: "https://ntfy.sh",
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
                ntfyUrl: "https://ntfy.sh",
                topic: "alerts",
            })
        ).rejects.toThrow(/Authentication failed when fetching messages/);
    });

    it("validates URL and topic before issuing the request", async () => {
        await expect(
            fetchMessages({
                ntfyUrl: "ftp://ntfy.sh",
                topic: "alerts",
            })
        ).rejects.toThrow(/Invalid ntfyUrl:/);

        await expect(
            fetchMessages({
                ntfyUrl: "https://ntfy.sh",
                topic: "topic.with.dots",
            })
        ).rejects.toThrow(/Invalid ntfyTopic:/);

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rejects malformed runtime fetch options before issuing the request", async () => {
        await expect(
            fetchMessages({
                ntfyUrl: "https://ntfy.sh",
                topic: "alerts",
                priorities: 3 as unknown as string | string[],
            })
        ).rejects.toThrow();

        expect(mockFetch).not.toHaveBeenCalled();
    });
});