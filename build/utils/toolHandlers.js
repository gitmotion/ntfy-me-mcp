import fetch from "node-fetch";
import { toolHandlerConfigSchema, } from "../schemas/toolHandlerConfig.schema.js";
import { Logger } from "./logger.js";
import { detectMarkdown } from "./markdown.js";
import { fetchMessages } from "./messages.js";
import { processActions } from "./actions.js";
import { sanitizeErrorMessage, validateNtfyTopic, validateNtfyUrl, } from "./validation.js";
const logger = Logger.getInstance();
export function createToolHandlers(config = {}) {
    const parsedConfig = toolHandlerConfigSchema.parse(config);
    const getDefaultTopic = parsedConfig.getDefaultTopic ?? (() => undefined);
    const getDefaultUrl = parsedConfig.getDefaultUrl ?? (() => "https://ntfy.sh");
    const getDefaultToken = parsedConfig.getDefaultToken ?? (() => undefined);
    function resolveTopic(ntfyTopic) {
        if (ntfyTopic) {
            return validateNtfyTopic(ntfyTopic, "ntfyTopic");
        }
        const defaultTopic = getDefaultTopic();
        if (defaultTopic) {
            return validateNtfyTopic(defaultTopic, "NTFY_TOPIC");
        }
        throw new Error("NTFY_TOPIC environment variable is required. Please ensure it's added to your .env file or passed as an environment variable.");
    }
    async function handleNotifyTool({ taskTitle, taskSummary, ntfyUrl, ntfyTopic, accessToken, priority, tags, markdown, actions, }) {
        try {
            const url = ntfyUrl || getDefaultUrl();
            const topic = resolveTopic(ntfyTopic);
            const token = accessToken || getDefaultToken();
            validateNtfyUrl(url);
            const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
            const endpoint = `${baseUrl}/${topic}`;
            const headers = {
                Title: taskTitle,
            };
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            if (priority) {
                headers.Priority = priority;
            }
            const viewActions = actions || processActions(taskSummary);
            const shouldUseMarkdown = markdown !== undefined ? markdown : detectMarkdown(taskSummary);
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
            logger.info(`Sending notification to ${cleanEndpoint}` +
                `${shouldUseMarkdown ? " with Markdown formatting" : ""}` +
                `${viewActions.length > 0 ? ` and ${viewActions.length} view action(s)` : ""}`);
            const response = await fetch(cleanEndpoint, {
                method: "POST",
                body: taskSummary,
                headers,
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Authentication failed when sending notification. " +
                        "This ntfy topic requires an access token. Please provide a token using the 'accessToken' parameter " +
                        "or set the NTFY_TOKEN environment variable.");
                }
                throw new Error(`Failed to send ntfy notification. Status code: ${response.status}`);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Notification sent successfully to ${cleanEndpoint}!`,
                    },
                ],
                structuredContent: {
                    success: true,
                    endpoint: cleanEndpoint,
                },
            };
        }
        catch (error) {
            const message = sanitizeErrorMessage(error, "Failed to send ntfy notification");
            return {
                content: [
                    {
                        type: "text",
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
    async function handleFetchTool({ ntfyUrl, ntfyTopic, accessToken, since, messageId, messageText, messageTitle, priorities, tags, }) {
        try {
            const url = ntfyUrl || getDefaultUrl();
            const topic = resolveTopic(ntfyTopic);
            const token = accessToken || getDefaultToken();
            const sinceSetting = since === null ? undefined : since || "10m";
            validateNtfyUrl(url);
            const messageRecords = await fetchMessages({
                ntfyUrl: url,
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
                            type: "text",
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
            const messagesCount = Object.values(messageRecords).reduce((sum, messages) => sum + messages.length, 0);
            const formattedMessages = Object.entries(messageRecords).map(([recordTopic, messages]) => ({
                type: "text",
                text: `Topic: ${recordTopic}\nMessages: ${messages.length}\n${JSON.stringify(messages, null, 2)}`,
            }));
            return {
                content: [
                    {
                        type: "text",
                        text: `Successfully fetched ${messagesCount} message(s) from ${Object.keys(messageRecords).length} topic(s)`,
                    },
                    ...formattedMessages,
                ],
                structuredContent: {
                    success: true,
                    messageCount: messagesCount,
                    topics: messageRecords,
                },
            };
        }
        catch (error) {
            const message = sanitizeErrorMessage(error, "Failed to fetch ntfy messages");
            return {
                content: [
                    {
                        type: "text",
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
