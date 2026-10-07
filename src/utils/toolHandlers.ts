import { type FetchToolInput } from "../schemas/fetchTool.schema.js";
import { type NotifyToolInput } from "../schemas/notifyTool.schema.js";
import {
    toolHandlerConfigSchema,
    type ToolHandlerConfig,
} from "../schemas/toolHandlerConfig.schema.js";
import { describeError, Logger } from "./logger.js";
import { encodeHeaderValue } from "./headers.js";
import { validateAccessToken } from "./validation.js";
import { detectMarkdown } from "./markdown.js";
import { fetchMessages } from "./messages.js";
import { processActions } from "./actions.js";
import {
    isSameOrigin,
    sanitizeErrorMessage,
    validateNtfyTopic,
    validateNtfyUrl,
    validateViewActions,
} from "./validation.js";

const logger = Logger.getInstance();

// Normalizes a URL for the "is this the configured server?" warning check
// (case of scheme/host, default ports, trailing slashes). Never used for routing.
function normalizeUrlForComparison(value: string): string {
    try {
        return new URL(value.trim()).href.replace(/\/+$/, "");
    } catch {
        return value.trim().replace(/\/+$/, "");
    }
}

export function createToolHandlers(config: ToolHandlerConfig = {}) {
    const parsedConfig = toolHandlerConfigSchema.parse(config);
    const getDefaultTopic = parsedConfig.getDefaultTopic ?? (() => undefined);
    const getDefaultUrl = parsedConfig.getDefaultUrl ?? (() => "https://ntfy.sh");
    const getDefaultToken = parsedConfig.getDefaultToken ?? (() => undefined);
    const allowTopicOverride = parsedConfig.allowTopicOverride ?? false;
    const allowUrlOverride = parsedConfig.allowUrlOverride ?? false;
    const allowedTopics = (parsedConfig.allowedTopics ?? []).map((topic) => topic.trim());

    function resolveUrl(url?: string): string {
        if (url && allowUrlOverride) {
            return url;
        }

        const defaultUrl = getDefaultUrl();
        if (url?.trim() && normalizeUrlForComparison(url) !== normalizeUrlForComparison(defaultUrl)) {
            logger.warn(
                "Ignoring the per-call url: url overrides are disabled. Set NTFY_ALLOW_URL_OVERRIDE=true to allow them."
            );
        }

        return defaultUrl;
    }

    function resolveTopic(topic?: string): string {
        // The allowlist is the more restrictive setting, so it wins over allowTopicOverride.
        // NTFY_TOPIC is always allowed, as in the schema enum.
        if (allowedTopics.length > 0 && topic?.trim()) {
            if (!allowedTopics.includes(topic.trim()) && topic.trim() !== getDefaultTopic()?.trim()) {
                throw new Error("Invalid topic: not in NTFY_TOPICS_ALLOWLIST.");
            }
            return validateNtfyTopic(topic, "topic");
        }

        if (topic && allowTopicOverride && allowedTopics.length === 0) {
            return validateNtfyTopic(topic, "topic");
        }

        const defaultTopic = getDefaultTopic();
        if (topic?.trim() && topic.trim() !== defaultTopic?.trim()) {
            logger.warn(
                "Ignoring the per-call topic: topic overrides are disabled. Set NTFY_ALLOW_TOPIC_OVERRIDE=true to allow them."
            );
        }

        if (defaultTopic) {
            return validateNtfyTopic(defaultTopic, "NTFY_TOPIC");
        }

        throw new Error(
            "NTFY_TOPIC environment variable is required. Please ensure it's added to your .env file or passed as an environment variable."
        );
    }

    /**
     * A non-blank accessToken is always used. A blank one ("", "  ") means "not
     * provided" (#38), like the other optional inputs. The configured NTFY_TOKEN
     * is only attached when the request goes to the same origin as NTFY_URL, so
     * a per-call url can't redirect the configured credential to another server.
     */
    function resolveToken(
        url: string,
        accessToken?: string
    ): { token?: string; withheldDefaultToken: boolean } {
        // Never fold NTFY_TOKEN into this value: an explicit token skips the
        // same-origin check below.
        const explicitToken = accessToken?.trim();
        if (explicitToken) {
            return { token: explicitToken, withheldDefaultToken: false };
        }

        const defaultToken = getDefaultToken();
        if (!defaultToken) {
            return { token: undefined, withheldDefaultToken: false };
        }

        if (isSameOrigin(url, getDefaultUrl())) {
            return { token: defaultToken, withheldDefaultToken: false };
        }

        logger.warn(
            "Not sending NTFY_TOKEN: the request URL is not on the NTFY_URL server. Pass accessToken to authenticate with another server."
        );
        return { token: undefined, withheldDefaultToken: true };
    }

    const WITHHELD_TOKEN_HINT =
        "NTFY_TOKEN is only sent to the NTFY_URL server; pass the 'accessToken' parameter to authenticate with this server.";

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
            const url = resolveUrl(customUrl);
            const topic = resolveTopic(customTopic);

            validateNtfyUrl(url, "url");
            const { token, withheldDefaultToken } = resolveToken(url, accessToken);

            const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
            const endpoint = `${baseUrl}/${topic}`;
            const headers: Record<string, string> = {
                Title: encodeHeaderValue(title),
            };

            if (token) {
                headers.Authorization = `Bearer ${validateAccessToken(token)}`;
            }

            if (priority) {
                headers.Priority = priority;
            }

            if (actions) {
                validateViewActions(actions);
            }
            const viewActions = actions || processActions(message);
            const shouldUseMarkdown =
                markdown !== undefined ? markdown : detectMarkdown(message);

            if (shouldUseMarkdown) {
                headers["X-Markdown"] = "true";
            }

            if (tags && tags.length > 0) {
                headers.Tags = encodeHeaderValue(tags.join(","));
            }

            if (viewActions.length > 0) {
                headers["X-Actions"] = encodeHeaderValue(JSON.stringify(viewActions));
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
                        (withheldDefaultToken
                            ? WITHHELD_TOKEN_HINT
                            : "This ntfy topic requires an access token. Please provide a token using the 'accessToken' parameter " +
                            "or set the NTFY_TOKEN environment variable.")
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
            logger.error(`Failed to send ntfy notification: ${describeError(error)}`);
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
            const url = resolveUrl(customUrl);
            const topic = resolveTopic(customTopic);
            const sinceSetting = since === null ? undefined : since || "10m";

            validateNtfyUrl(url, "url");
            const { token, withheldDefaultToken } = resolveToken(url, accessToken);

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
            }).catch((error: unknown) => {
                if (
                    withheldDefaultToken &&
                    error instanceof Error &&
                    error.message.startsWith("Authentication failed when fetching messages.")
                ) {
                    throw new Error(`Authentication failed when fetching messages. ${WITHHELD_TOKEN_HINT}`);
                }
                throw error;
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
            logger.error(`Failed to fetch ntfy messages: ${describeError(error)}`);
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