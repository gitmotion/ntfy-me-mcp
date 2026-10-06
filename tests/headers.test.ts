import { describe, expect, it } from "vitest";
import { encodeHeaderValue } from "../src/utils/headers.js";

function decodeRfc2047(value: string): string {
    const match = /^=\?UTF-8\?B\?([A-Za-z0-9+/=]*)\?=$/.exec(value);
    if (!match) throw new Error(`not an RFC 2047 base64 word: ${value}`);
    return Buffer.from(match[1], "base64").toString("utf8");
}

describe("encodeHeaderValue", () => {
    it("leaves printable ASCII unchanged", () => {
        expect(encodeHeaderValue("Build finished: 3/3 ok, tags=a,b")).toBe(
            "Build finished: 3/3 ok, tags=a,b"
        );
        expect(encodeHeaderValue("")).toBe("");
    });

    it.each([
        ["emoji", "🔔 Deploy done 🎉"],
        ["Latin-1 accents", "Café crème ü"],
        ["CJK", "部署完成"],
        ["newline", "line one\nline two"],
    ])("RFC 2047-encodes %s so it round-trips as UTF-8", (_label, value) => {
        const encoded = encodeHeaderValue(value);

        expect(encoded).toMatch(/^=\?UTF-8\?B\?[A-Za-z0-9+/=]*\?=$/);
        expect(decodeRfc2047(encoded)).toBe(value);
    });

    it("encodes ASCII that contains an encoded-word marker, so ntfy can't rewrite it", () => {
        const value = "ascii =?UTF-8?B?aGFja2Vk?= literal";
        const encoded = encodeHeaderValue(value);

        expect(encoded).not.toBe(value);
        expect(decodeRfc2047(encoded)).toBe(value);
    });

    it("produces only header-safe ASCII", () => {
        expect(encodeHeaderValue("🚀 ünïcödé")).toMatch(/^[\x20-\x7e]+$/);
    });
});
