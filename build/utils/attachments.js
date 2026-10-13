import { cleanUrl, URL_PATTERN } from "./actions.js";
// Markdown image syntax: ![alt](url) or ![alt](url "title")
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(\s*(https?:\/\/[^\s\)]+?)(?:\s+["'][^"']*["'])?\s*\)/gi;
const SUPPORTED_IMAGE_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
];
/**
 * Checks whether a URL points to an image with a supported extension (.png, .jpg, .jpeg, .gif, .webp).
 * Query parameters and hash fragments are ignored when checking the path extension.
 */
function isBareImageUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }
        const pathname = parsed.pathname.toLowerCase();
        return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
    }
    catch {
        return false;
    }
}
/**
 * Detects an image URL in message text for use as an attachment (#27).
 *
 * Checks markdown image syntax ![alt](url) first, then bare URLs ending in
 * .png, .jpg, .jpeg, .gif, or .webp (query string allowed). When multiple
 * images are present, the first one found wins.
 *
 * @param text The message body to scan
 * @returns The first detected image URL, or undefined if none found
 */
export function detectImageUrl(text) {
    if (!text) {
        return undefined;
    }
    // 1. Markdown image syntax ![alt](url) first
    const markdownMatches = Array.from(text.matchAll(new RegExp(MARKDOWN_IMAGE_PATTERN)));
    for (const match of markdownMatches) {
        const rawUrl = match[2];
        if (rawUrl) {
            const cleaned = cleanUrl(rawUrl);
            try {
                const parsed = new URL(cleaned);
                if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                    return cleaned;
                }
            }
            catch {
                // Ignore invalid URLs
            }
        }
    }
    // 2. Bare URLs ending in .png|.jpg|.jpeg|.gif|.webp
    const urlMatches = Array.from(text.matchAll(new RegExp(URL_PATTERN)));
    for (const match of urlMatches) {
        const cleaned = cleanUrl(match[0]);
        if (isBareImageUrl(cleaned)) {
            return cleaned;
        }
    }
    return undefined;
}
