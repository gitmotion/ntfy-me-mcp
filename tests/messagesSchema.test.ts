import { describe, expect, it } from "vitest";
import { messageDataSchema } from "../src/schemas/messageData.schema.js";
import { ntfyFetchOptionsSchema } from "../src/schemas/ntfyFetchOptions.schema.js";

describe("ntfyFetchOptionsSchema", () => {
    it("accepts valid fetch options", () => {
        expect(
            ntfyFetchOptionsSchema.parse({
                url: "https://ntfy.sh",
                topic: "ntfy_topic",
                token: "secret",
                since: "10m",
                messageId: "abc123",
                messageText: "hello",
                messageTitle: "status",
                priorities: ["high", "default"],
                tags: ["ops", "prod"],
            })
        ).toEqual({
            url: "https://ntfy.sh",
            topic: "ntfy_topic",
            token: "secret",
            since: "10m",
            messageId: "abc123",
            messageText: "hello",
            messageTitle: "status",
            priorities: ["high", "default"],
            tags: ["ops", "prod"],
        });
    });

    it("rejects invalid topic values", () => {
        expect(() =>
            ntfyFetchOptionsSchema.parse({
                url: "https://ntfy.sh",
                topic: "topic.with.dots",
            })
        ).toThrow(/ntfyTopic may only contain/);
    });

    it("rejects invalid priority filters", () => {
        expect(() =>
            ntfyFetchOptionsSchema.parse({
                url: "https://ntfy.sh",
                topic: "ntfy_topic",
                priorities: ["high", "urgent"],
            })
        ).toThrow();
    });
});

describe("messageDataSchema", () => {
    it("accepts valid message payloads with extra fields", () => {
        expect(
            messageDataSchema.parse({
                id: "abc123",
                time: 123,
                event: "message",
                topic: "ntfy_topic",
                message: "hello",
                title: "status",
                priority: 3,
                tags: ["ops"],
                click: "https://example.com",
                expires: 456,
                extraField: "kept",
            })
        ).toEqual({
            id: "abc123",
            time: 123,
            event: "message",
            topic: "ntfy_topic",
            message: "hello",
            title: "status",
            priority: 3,
            tags: ["ops"],
            click: "https://example.com",
            expires: 456,
            extraField: "kept",
        });
    });

    it("rejects invalid attachment data", () => {
        expect(() =>
            messageDataSchema.parse({
                id: "abc123",
                time: 123,
                event: "message",
                topic: "ntfy_topic",
                attachment: {
                    name: "file.txt",
                    type: "text/plain",
                    size: "bad",
                    expires: 456,
                    url: "https://example.com/file.txt",
                },
            })
        ).toThrow();
    });
});