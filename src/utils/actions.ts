import { type ViewAction } from "../schemas/viewAction.schema.js";

// URL regex pattern to find URLs in text
const URL_PATTERN = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

/**
 * Clean a URL by removing trailing markdown-related characters
 * @param url The URL to clean
 * @returns Cleaned URL
 */
function cleanUrl(url: string): string {
  // Remove trailing parenthesis that might be from markdown
  if (url.endsWith(')')) {
    // Only remove if it's not part of a properly encoded URL
    const hasOpenParen = url.slice(0, -1).includes('(');
    if (!hasOpenParen) {
      url = url.slice(0, -1);
    }
  }
  return url.trim();
}

/**
 * Extract URLs from text and create view actions
 * 
 * @param text The text to process for URLs
 * @returns Array of view actions
 */
export function processActions(text: string): ViewAction[] {
  // Using matchAll to get all matches with their positions
  const urlMatches = Array.from(text.matchAll(new RegExp(URL_PATTERN)));
  const actions: ViewAction[] = [];

  if (urlMatches.length === 0) {
    return actions;
  }

  // Process URLs for actions (first 3)
  const actionUrls = urlMatches
    .slice(0, Math.min(3, urlMatches.length))
    .map(match => cleanUrl(match[0]));

  for (const url of actionUrls) {
    let label: string;
    try {
      const urlObj = new URL(url);
      label = urlObj.hostname.replace(/^www\./, '').replace(/\.(com|org|net|io|dev)$/, '');
    } catch {
      label = 'link';
    }

    actions.push({
      action: "view",
      label: `Open ${label}`,
      url,
      clear: true
    });
  }

  return actions;
}