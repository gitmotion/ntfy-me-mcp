import { describe, expect, it } from "vitest";
import { detectImageUrl } from "../src/utils/attachments.js";

describe("detectImageUrl (#27)", () => {
    it("returns undefined for empty text or text without URLs", () => {
        expect(detectImageUrl("")).toBeUndefined();
        expect(detectImageUrl("Just some plain text without any links")).toBeUndefined();
    });

    describe("markdown image syntax", () => {
        it("detects markdown image syntax ![alt](url)", () => {
            expect(
                detectImageUrl("Check out this image: ![Cute Cat](https://example.com/cat.jpg)")
            ).toBe("https://example.com/cat.jpg");
        });

        it("detects markdown image syntax with empty alt text", () => {
            expect(
                detectImageUrl("Photo: ![](https://example.com/cat.png)")
            ).toBe("https://example.com/cat.png");
        });

        it("detects markdown image syntax with title in quotes", () => {
            expect(
                detectImageUrl('![Diagram](https://example.com/diagram.png "System Architecture")')
            ).toBe("https://example.com/diagram.png");
        });

        it("detects markdown image without an extension (explicit markdown syntax)", () => {
            expect(
                detectImageUrl("![Dynamic Chart](https://example.com/api/chart?user=123&type=bar)")
            ).toBe("https://example.com/api/chart?user=123&type=bar");
        });

        it("ignores non-http(s) schemes in markdown images", () => {
            expect(
                detectImageUrl("![Local](file:///etc/passwd) and ![FTP](ftp://example.com/pic.png)")
            ).toBeUndefined();
        });
    });

    describe("bare image URLs", () => {
        it.each([
            ["https://example.com/photo.png", "https://example.com/photo.png"],
            ["https://example.com/photo.jpg", "https://example.com/photo.jpg"],
            ["https://example.com/photo.jpeg", "https://example.com/photo.jpeg"],
            ["https://example.com/animation.gif", "https://example.com/animation.gif"],
            ["https://example.com/photo.webp", "https://example.com/photo.webp"],
            ["http://insecure.example.com/photo.png", "http://insecure.example.com/photo.png"],
        ])("detects bare URL ending in %s", (input, expected) => {
            expect(detectImageUrl(`See ${input} for the full view`)).toBe(expected);
        });

        it("handles case-insensitive extensions (.PNG, .JPG)", () => {
            expect(
                detectImageUrl("View at https://example.com/banner.PNG")
            ).toBe("https://example.com/banner.PNG");
            expect(
                detectImageUrl("View at https://example.com/banner.JPG")
            ).toBe("https://example.com/banner.JPG");
        });

        it("preserves query string on bare image URLs", () => {
            expect(
                detectImageUrl("Image: https://example.com/cat.jpg?width=400&height=300&v=2#preview")
            ).toBe("https://example.com/cat.jpg?width=400&height=300&v=2#preview");
        });

        it("cleans trailing parenthesis from bare URL in markdown links", () => {
            expect(
                detectImageUrl("Link: [cat photo](https://example.com/cat.png)")
            ).toBe("https://example.com/cat.png");
        });
    });

    describe("non-image URLs ignored", () => {
        it.each([
            "https://example.com/index.html",
            "https://example.com/document.pdf",
            "https://example.com/archive.zip",
            "https://example.com/api/status",
            "https://example.com/search?q=cat.png", // query has .png but pathname does not
            "https://example.com/cat.png/view",     // .png is part of directory, not file extension
        ])("ignores non-image URL %s", (url) => {
            expect(detectImageUrl(`Check this out: ${url}`)).toBeUndefined();
        });
    });

    describe("multiple images (first wins)", () => {
        it("picks the first markdown image when multiple markdown images exist", () => {
            const text = "![first](https://example.com/1.png) and ![second](https://example.com/2.png)";
            expect(detectImageUrl(text)).toBe("https://example.com/1.png");
        });

        it("picks the first bare image URL when multiple bare URLs exist", () => {
            const text = "See https://example.com/first.jpg and https://example.com/second.png";
            expect(detectImageUrl(text)).toBe("https://example.com/first.jpg");
        });

        it("prioritizes markdown image syntax over earlier bare image URLs", () => {
            const text = "Bare url: https://example.com/bare.jpg and markdown: ![md](https://example.com/md.png)";
            expect(detectImageUrl(text)).toBe("https://example.com/md.png");
        });
    });
});
