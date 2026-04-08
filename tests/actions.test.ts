import { describe, it, expect } from 'vitest';
import { processActions } from '../src/utils/actions.js';

describe('processActions', () => {
    it('returns empty array for text with no URLs', () => {
        expect(processActions('just some plain text')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
        expect(processActions('')).toEqual([]);
    });

    it('extracts a single URL and creates a view action', () => {
        const result = processActions('Check out https://example.com');
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            action: 'view',
            label: 'Open example',
            url: 'https://example.com',
            clear: true,
        });
    });

    it('extracts up to 3 URLs max from text with more than 3', () => {
        const text =
            'Links: https://one.com https://two.com https://three.com https://four.com https://five.com';
        const result = processActions(text);
        expect(result).toHaveLength(3);
        expect(result.map(a => a.url)).toEqual([
            'https://one.com',
            'https://two.com',
            'https://three.com',
        ]);
    });

    it('sets action to "view" and clear to true on every result', () => {
        const result = processActions('https://a.io https://b.dev');
        for (const action of result) {
            expect(action.action).toBe('view');
            expect(action.clear).toBe(true);
        }
    });

    it('strips www. prefix from label', () => {
        const result = processActions('https://www.github.com/repo');
        expect(result[0].label).toBe('Open github');
    });

    it('strips common TLDs (.com, .org, .net, .io, .dev) from label', () => {
        const cases = [
            { url: 'https://example.com', expected: 'Open example' },
            { url: 'https://example.org', expected: 'Open example' },
            { url: 'https://example.net', expected: 'Open example' },
            { url: 'https://example.io', expected: 'Open example' },
            { url: 'https://example.dev', expected: 'Open example' },
        ];
        for (const { url, expected } of cases) {
            const result = processActions(url);
            expect(result[0].label).toBe(expected);
        }
    });

    it('keeps non-common TLDs in the label', () => {
        const result = processActions('https://example.xyz/page');
        expect(result[0].label).toBe('Open example.xyz');
    });

    it('handles URLs with paths and query params', () => {
        const result = processActions(
            'Visit https://example.com/path/to/page?foo=bar&baz=1#section',
        );
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe(
            'https://example.com/path/to/page?foo=bar&baz=1#section',
        );
        expect(result[0].label).toBe('Open example');
    });

    it('cleans trailing parenthesis from markdown-style URLs', () => {
        // Markdown link like [text](https://example.com) — the regex may capture the trailing )
        const result = processActions('see [link](https://example.com)');
        expect(result).toHaveLength(1);
        expect(result[0].url).not.toMatch(/\)$/);
    });

    it('keeps trailing parenthesis when URL itself contains matching parens', () => {
        // Wikipedia-style URL with balanced parens
        const result = processActions(
            'https://en.wikipedia.org/wiki/Rust_(programming_language)',
        );
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe(
            'https://en.wikipedia.org/wiki/Rust_(programming_language)',
        );
    });

    it('handles http (non-https) URLs', () => {
        const result = processActions('http://legacy-site.org/old');
        expect(result).toHaveLength(1);
        expect(result[0].url).toBe('http://legacy-site.org/old');
    });

    it('handles multiple URLs embedded in prose', () => {
        const text =
            'Go to https://docs.example.com for docs and https://api.example.com/v2 for the API.';
        const result = processActions(text);
        expect(result).toHaveLength(2);
        expect(result[0].url).toBe('https://docs.example.com');
        expect(result[1].url).toBe('https://api.example.com/v2');
    });
});
