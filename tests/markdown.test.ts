import { describe, it, expect } from 'vitest';
import {
    detectMarkdown,
    hasCommonMarkdownPatterns,
    containsMarkdown,
} from '../src/utils/markdown.js';

describe('detectMarkdown', () => {
    it('returns false for plain text without markdown patterns', () => {
        expect(detectMarkdown('Hello world')).toBe(false);
        expect(detectMarkdown('Just a simple sentence.')).toBe(false);
        expect(detectMarkdown('Line one\nLine two\nLine three')).toBe(false);
    });

    it('returns true for bold text', () => {
        expect(detectMarkdown('This is **bold** text')).toBe(true);
    });

    it('returns true for italic text', () => {
        expect(detectMarkdown('This is *italic* text')).toBe(true);
    });

    it('returns true for headers', () => {
        expect(detectMarkdown('# Header 1')).toBe(true);
        expect(detectMarkdown('## Header 2')).toBe(true);
        expect(detectMarkdown('### Header 3')).toBe(true);
    });

    it('returns true for unordered lists', () => {
        expect(detectMarkdown('- item one')).toBe(true);
        expect(detectMarkdown('* item one')).toBe(true);
        expect(detectMarkdown('+ item one')).toBe(true);
    });

    it('returns true for ordered lists', () => {
        expect(detectMarkdown('1. First item')).toBe(true);
        expect(detectMarkdown('2. Second item')).toBe(true);
    });

    it('returns true for code blocks', () => {
        expect(detectMarkdown('```\nconst x = 1;\n```')).toBe(true);
        expect(detectMarkdown('```ts\nconst x = 1;\n```')).toBe(true);
    });

    it('returns true for inline code', () => {
        expect(detectMarkdown('Use `console.log()` to debug')).toBe(true);
    });

    it('returns true for links', () => {
        expect(detectMarkdown('Visit [Google](https://google.com)')).toBe(true);
    });

    it('returns true for blockquotes', () => {
        expect(detectMarkdown('> This is a quote')).toBe(true);
    });

    it('returns true for tables', () => {
        expect(detectMarkdown('|col1|col2|col3|')).toBe(true);
    });
});

describe('hasCommonMarkdownPatterns', () => {
    it('returns false for plain text', () => {
        expect(hasCommonMarkdownPatterns('Hello world')).toBe(false);
        expect(hasCommonMarkdownPatterns('Nothing special')).toBe(false);
    });

    it('returns true for strikethrough', () => {
        expect(hasCommonMarkdownPatterns('This is ~~deleted~~ text')).toBe(true);
    });

    it('returns true for images', () => {
        expect(hasCommonMarkdownPatterns('![alt text](https://example.com/img.png)')).toBe(true);
    });

    it('returns true for horizontal rules', () => {
        expect(hasCommonMarkdownPatterns('---')).toBe(true);
        expect(hasCommonMarkdownPatterns('----')).toBe(true);
    });
});

describe('containsMarkdown', () => {
    it('returns false for plain text', () => {
        expect(containsMarkdown('Hello world')).toBe(false);
        expect(containsMarkdown('Just plain text with no formatting')).toBe(false);
        expect(containsMarkdown('email@example.com or call (555) 1234')).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(containsMarkdown('')).toBe(false);
    });

    it('returns true for text with formatting tokens', () => {
        expect(containsMarkdown('This is **bold** text')).toBe(true);
        expect(containsMarkdown('This is *italic* text')).toBe(true);
        expect(containsMarkdown('Some text with `inline code` in it')).toBe(true);
    });
});
