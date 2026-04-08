import fetch from 'node-fetch';
import { Logger } from './logger.js';
import {
  messageDataSchema,
  type MessageData,
} from '../schemas/messageData.schema.js';
import {
  ntfyFetchOptionsSchema,
  type NtfyFetchOptions,
} from '../schemas/ntfyFetchOptions.schema.js';
import { validateNtfyTopic, validateNtfyUrl } from './validation.js';

const logger = Logger.getInstance();

/**
 * Fetches cached messages from an ntfy server
 * 
 * @param options Configuration options for the fetch operation
 * @returns A record of message arrays organized by topic
 */
export async function fetchMessages(options: NtfyFetchOptions): Promise<Record<string, MessageData[]> | null> {
  try {
    // Validate the URL to prevent prompt injection via malicious URL values
    validateNtfyUrl(options.ntfyUrl, "ntfyUrl");
    const topic = validateNtfyTopic(options.topic, 'ntfyTopic');
    const parsedOptions = ntfyFetchOptionsSchema.parse({
      ...options,
      topic,
    });

    // Prepare the URL with proper handling of trailing slashes
    const baseUrl = parsedOptions.ntfyUrl.endsWith("/")
      ? parsedOptions.ntfyUrl.slice(0, -1)
      : parsedOptions.ntfyUrl;

    // Start with the basic endpoint
    let endpoint = `${baseUrl}/${topic}/json?poll=1`;

    // Add the since parameter if provided
    if (parsedOptions.since !== undefined && parsedOptions.since !== null) {
      endpoint += `&since=${parsedOptions.since}`;
    }

    // Prepare headers
    const headers: Record<string, string> = {};

    // Add authorization if token is provided
    if (parsedOptions.token) {
      headers.Authorization = `Bearer ${parsedOptions.token}`;
    }

    // Add filter headers if provided
    if (parsedOptions.messageId) {
      headers['X-ID'] = parsedOptions.messageId;
    }

    if (parsedOptions.messageText) {
      headers['X-Message'] = parsedOptions.messageText;
    }

    if (parsedOptions.messageTitle) {
      headers['X-Title'] = parsedOptions.messageTitle;
    }

    if (parsedOptions.priorities) {
      // Handle both string and string[] formats
      const priorityValue = Array.isArray(parsedOptions.priorities)
        ? parsedOptions.priorities.join(',')
        : parsedOptions.priorities;
      headers['X-Priority'] = priorityValue;
    }

    if (parsedOptions.tags) {
      // Handle both string and string[] formats
      const tagsValue = Array.isArray(parsedOptions.tags)
        ? parsedOptions.tags.join(',')
        : parsedOptions.tags;
      headers['X-Tags'] = tagsValue;
    }

    // Log helpful message with filter information
    const appliedFilters: string[] = [];
    if (parsedOptions.messageId) appliedFilters.push('messageId');
    if (parsedOptions.messageTitle) appliedFilters.push('messageTitle');
    if (parsedOptions.messageText) appliedFilters.push('messageText');
    if (parsedOptions.priorities) appliedFilters.push('priorities');
    if (parsedOptions.tags) appliedFilters.push('tags');

    logger.info(
      `Fetching messages for topic ${topic}` +
      `${appliedFilters.length > 0 ? ` with filters: ${appliedFilters.join(', ')}` : ''}`
    );

    // Make the API call
    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Authentication failed when fetching messages. ' +
          `This ntfy topic requires an access token.`
        );
      }

      // Handle other errors
      throw new Error(
        `Failed to fetch ntfy messages. Status code: ${response.status}`
      );
    }

    // Get the raw response data
    const rawResponse = await response.text();
    if (!rawResponse) return null;

    // Process the response as line-delimited JSON
    const messageData: MessageData[] = rawResponse
      .split('\n') // Split by newlines
      .filter((line: string) => line.trim().length > 0) // Remove empty lines
      .map((line: string) => {
        let parsedLine: unknown;

        try {
          parsedLine = JSON.parse(line); // Parse each line as JSON
        } catch {
          logger.warn('Skipping invalid JSON line returned by ntfy server.');
          return null; // Skip invalid JSON lines
        }

        const parsedMessage = messageDataSchema.safeParse(parsedLine);
        if (!parsedMessage.success) {
          logger.warn('Skipping invalid message payload returned by ntfy server.');
          return null;
        }

        return parsedMessage.data;
      })
      .filter((msg: MessageData | null) => msg !== null) as MessageData[]; // Filter out invalid messages

    // Organize messages by topic
    const messageRecords: Record<string, MessageData[]> = {};
    messageData.forEach((data) => {
      const topic = data.topic;
      if (!messageRecords[topic]) messageRecords[topic] = [];
      messageRecords[topic].push(data);
    });

    return messageRecords;
  } catch (error: unknown) {
    logger.error('Failed to fetch messages from ntfy server.');
    throw error;
  }
}