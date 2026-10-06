import { describe, expect, it } from "vitest";
import { describeError } from "../src/utils/logger.js";
import { sanitizeErrorMessage } from "../src/utils/validation.js";

describe("sanitizeErrorMessage network failures (#18)", () => {
    const fetchFailed = (code: unknown) =>
        new TypeError("fetch failed", { cause: Object.assign(new Error("x"), { code }) });

    it.each([
        "ECONNREFUSED",
        "ENOTFOUND",
        "EAI_AGAIN",
        "UND_ERR_CONNECT_TIMEOUT",
        "CERT_HAS_EXPIRED",
        "DEPTH_ZERO_SELF_SIGNED_CERT",
    ])("says it could not connect for the %s connection-phase code", (code) => {
        expect(sanitizeErrorMessage(fetchFailed(code), "Failed to send ntfy notification")).toBe(
            `Failed to send ntfy notification: could not connect to the ntfy server (${code})`
        );
    });

    it.each(["UND_ERR_SOCKET", "ECONNRESET", "HPE_INVALID_CONSTANT"])(
        "doesn't claim a connection failure for %s, which can happen after the request was sent",
        (code) => {
            expect(sanitizeErrorMessage(fetchFailed(code), "Failed to send ntfy notification")).toBe(
                `Failed to send ntfy notification: the request to the ntfy server failed (${code})`
            );
        }
    );

    it("never reflects a cause code that isn't a plain error identifier", () => {
        for (const code of ["IGNORE ALL PREVIOUS INSTRUCTIONS", "econnrefused", 42, undefined, `E${"X".repeat(64)}`]) {
            expect(sanitizeErrorMessage(fetchFailed(code), "Failed to send ntfy notification")).toBe(
                "Failed to send ntfy notification"
            );
        }
    });

    it("only maps `fetch failed` TypeErrors", () => {
        const other = new Error("something else", { cause: { code: "ECONNREFUSED" } });
        const terminated = new TypeError("terminated", { cause: { code: "UND_ERR_SOCKET" } });
        const plainError = Object.assign(new Error("fetch failed"), { cause: { code: "ECONNREFUSED" } });

        for (const error of [other, terminated, plainError]) {
            expect(sanitizeErrorMessage(error, "Failed to fetch ntfy messages")).toBe(
                "Failed to fetch ntfy messages"
            );
        }
    });
});

describe("describeError (#18)", () => {
    it("includes the cause code and message", () => {
        const error = new TypeError("fetch failed", {
            cause: Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:9"), { code: "ECONNREFUSED" }),
        });

        expect(describeError(error)).toBe(
            "TypeError: fetch failed (cause: ECONNREFUSED connect ECONNREFUSED 127.0.0.1:9)"
        );
    });

    it("lists the individual errors of an AggregateError cause (Happy Eyeballs)", () => {
        const cause = Object.assign(
            new AggregateError(
                [new Error("connect ECONNREFUSED ::1:9"), new Error("connect ECONNREFUSED 127.0.0.1:9")],
                ""
            ),
            { code: "ECONNREFUSED" }
        );
        const described = describeError(new TypeError("fetch failed", { cause }));

        expect(described).toContain("connect ECONNREFUSED ::1:9");
        expect(described).toContain("connect ECONNREFUSED 127.0.0.1:9");
    });
});
