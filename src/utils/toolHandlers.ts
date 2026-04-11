import fetch from "node-fetch";
import { type FetchToolInput } from "../schemas/fetchTool.schema.js";
import { type NotifyToolInput } from "../schemas/notifyTool.schema.js";
import {
    toolHandlerConfigSchema,
    type ToolHandlerConfig,
} from "../schemas/toolHandlerConfig.schema.js";
import { Logger } from "./logger.js";
import { detectMarkdown } from "./markdown.js";
import { fetchMessages } from "./messages.js";
import { processActions } from "./actions.js";
import {
    sanitizeErrorMessage,
    validateNtfyTopic,
    validateNtfyUrl,
} from "./validation.js";

const logger = Logger.getInstance();

export function createToolHandlers(config: ToolHandlerConfig = {}) {
    const parsedConfig = toolHandlerConfigSchema.parse(config);
    const getDefaultTopic = parsedConfig.getDefaultTopic ?? (() => undefined);
    const getDefaultUrl = parsedConfig.getDefaultUrl ?? (() => "https://ntfy.sh");
    const getDefaultToken = parsedConfig.getDefaultToken ?? (() => undefined);

    function resolveTopic(topic?: string): string {
        if (topic) {
            return validateNtfyTopic(topic, "topic");
        }

        const defaultTopic = getDefaultTopic();
        if (defaultTopic) {
            return validateNtfyTopic(defaultTopic, "NTFY_TOPIC");
        }

        throw new Error(
            "NTFY_TOPIC environment variable is required. Please ensure it's added to your .env file or passed as an environment variable."
        );
    }

    async function handleNotifyTool({
        title,
        message,
        url: customUrl,
        topic: customTopic,
        accessToken,
        priority,
        tags,
        markdown,
        actions,
    }: NotifyToolInput) {
        try {
            const url = customUrl || getDefaultUrl();
            const topic = resolveTopic(customTopic);
            const token = accessToken || getDefaultToken();

            validateNtfyUrl(url, "url");

            const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
            const endpoint = `${baseUrl}/${topic}`;
            const headers: Record<string, string> = {
                Title: title,
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            if (priority) {
                headers.Priority = priority;
            }

            const viewActions = actions || processActions(message);
            const shouldUseMarkdown =
                markdown !== undefined ? markdown : detectMarkdown(message);

            if (shouldUseMarkdown) {
                headers["X-Markdown"] = "true";
            }

            if (tags && tags.length > 0) {
                headers.Tags = tags.join(",");
            }

            if (viewActions.length > 0) {
                headers["X-Actions"] = JSON.stringify(viewActions);
            }

            const cleanEndpoint = endpoint.trim();

            logger.info(
                `Sending notification to ${cleanEndpoint}` +
                `${shouldUseMarkdown ? " with Markdown formatting" : ""}` +
                `${viewActions.length > 0 ? ` and ${viewActions.length} view action(s)` : ""}`
            );

            const response = await fetch(cleanEndpoint, {
                method: "POST",
                body: message,
                headers,
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        "Authentication failed when sending notification. " +
                        "This ntfy topic requires an access token. Please provide a token using the 'accessToken' parameter " +
                        "or set the NTFY_TOKEN environment variable."
                    );
                }

                throw new Error(
                    `Failed to send ntfy notification. Status code: ${response.status}`
                );
            }

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Notification sent successfully to ${cleanEndpoint}!`,
                    },
                ],
                structuredContent: {
                    success: true,
                    endpoint: cleanEndpoint,
                },
            };
        } catch (error: unknown) {
            const message = sanitizeErrorMessage(
                error,
                "Failed to send ntfy notification"
            );
            return {
                content: [
                    {
                        type: "text" as const,
                        text: message,
                    },
                ],
                structuredContent: {
                    success: false,
                    error: message,
                },
                isError: true,
            };
        }
    }

    async function handleFetchTool({
        url: customUrl,
        topic: customTopic,
        accessToken,
        since,
        messageId,
        messageText,
        messageTitle,
        priorities,
        tags,
    }: FetchToolInput) {
        try {
            const url = customUrl || getDefaultUrl();
            const topic = resolveTopic(customTopic);
            const token = accessToken || getDefaultToken();
            const sinceSetting = since === null ? undefined : since || "10m";

            validateNtfyUrl(url, "url");

            const messageRecords = await fetchMessages({
                url,
                topic,
                token,
                since: sinceSetting,
                messageId,
                messageText,
                messageTitle,
                priorities,
                tags,
            });

            if (!messageRecords) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `No messages found in topic ${topic}`,
                        },
                    ],
                    structuredContent: {
                        success: true,
                        topic,
                        messages: [],
                    },
                };
            }

            const messagesCount = Object.values(messageRecords).reduce(
                (sum, messages) => sum + messages.length,
                0
            );
            const formattedMessages = Object.entries(messageRecords).map(
                ([recordTopic, messages]) => ({
                    type: "text" as const,
                    text: `Topic: ${recordTopic}\nMessages: ${messages.length}\n${JSON.stringify(
                        messages,
                        null,
                        2
                    )}`,
                })
            );

            return {
                content: [
                    {
                        type: "text" as const,
                        text: `Successfully fetched ${messagesCount} message(s) from ${Object.keys(
                            messageRecords
                        ).length} topic(s)`,
                    },
                    ...formattedMessages,
                ],
                structuredContent: {
                    success: true,
                    messageCount: messagesCount,
                    topics: messageRecords,
                },
            };
        } catch (error: unknown) {
            const message = sanitizeErrorMessage(error, "Failed to fetch ntfy messages");
            return {
                content: [
                    {
                        type: "text" as const,
                        text: message,
                    },
                ],
                structuredContent: {
                    success: false,
                    error: message,
                },
                isError: true,
            };
        }
    }

    return {
        resolveTopic,
        handleNotifyTool,
        handleFetchTool,
    };
}