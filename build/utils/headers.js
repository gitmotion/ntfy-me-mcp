// Printable ASCII is safe to send as-is in an HTTP header.
const PLAIN_HEADER_VALUE = /^[\x20-\x7e]*$/;
/**
 * Makes a header value safe for Node's fetch and readable by ntfy.
 *
 * HTTP header values must be ByteStrings, so `fetch` throws on characters
 * above U+00FF (emoji, CJK, …) and sends Latin-1 characters as raw bytes that
 * ntfy then mis-reads as UTF-8. ntfy decodes RFC 2047 encoded-words in every
 * header parameter, so any value that isn't plain printable ASCII is sent as
 * `=?UTF-8?B?<base64>?=`.
 *
 * @param value The header value to send
 * @returns The value unchanged when it's printable ASCII, otherwise RFC 2047-encoded
 */
export function encodeHeaderValue(value) {
    if (PLAIN_HEADER_VALUE.test(value)) {
        return value;
    }
    return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
