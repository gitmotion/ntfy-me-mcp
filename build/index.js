#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { createFetchToolInputSchema, } from "./schemas/fetchTool.schema.js";
import { createNotifyToolInputSchema, } from "./schemas/notifyTool.schema.js";
import { parseBooleanEnv, parseTopicAllowlist } from "./utils/env.js";
import { hasUnresolvedPlaceholder, isUnresolvedInputReference, validateStartupConfig, } from "./utils/validation.js";
import { createToolHandlers } from "./utils/toolHandlers.js";
import { Logger } from "./utils/logger.js";
const logger = Logger.getInstance();
// Get package.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
// Explicit options take precedence over dotenv's DOTENV_* / DOTENV_CONFIG_*
// env vars: never print (stdout is the MCP JSON-RPC channel), never let a
// .env override the client's config, and only read ./.env as UTF-8 (dotenv 17
// behavior). DOTENV_FAST is left alone: its parser reads .env files the same.
dotenv.config({
    quiet: true,
    debug: false,
    override: false,
    path: join(process.cwd(), ".env"),
    encoding: "utf8",
});
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const NTFY_URL = process.env.NTFY_URL || "https://ntfy.sh";
const RAW_NTFY_TOKEN = process.env.NTFY_TOKEN?.trim() ?? "";
const HAS_UNRESOLVED_TOKEN_INPUT = isUnresolvedInputReference(RAW_NTFY_TOKEN);
// Any other ${…} the client didn't substitute (#46), e.g. ${env:NTFY_TOKEN}.
const HAS_UNRESOLVED_TOKEN_PLACEHOLDER = !HAS_UNRESOLVED_TOKEN_INPUT && hasUnresolvedPlaceholder(RAW_NTFY_TOKEN);
const NTFY_TOKEN = HAS_UNRESOLVED_TOKEN_INPUT || HAS_UNRESOLVED_TOKEN_PLACEHOLDER ? "" : RAW_NTFY_TOKEN;
const NTFY_ALLOW_TOPIC_OVERRIDE = parseBooleanEnv(process.env.NTFY_ALLOW_TOPIC_OVERRIDE);
const NTFY_ALLOW_URL_OVERRIDE = parseBooleanEnv(process.env.NTFY_ALLOW_URL_OVERRIDE);
async function initializeServer() {
    // Validate before anything logs NTFY_URL (#30): a URL with embedded
    // credentials must never reach stderr, which clients keep in log files.
    let defaultTopic;
    try {
        defaultTopic = validateStartupConfig(NTFY_TOPIC, NTFY_URL).topic;
    }
    catch (error) {
        logger.error(error instanceof Error ? error.message : "Invalid NTFY_TOPIC or NTFY_URL. Exiting.");
        process.exit(1);
    }
    // stdin and stdout are the MCP JSON-RPC channel, so the server can't prompt
    // for a token the client failed to substitute: say so and exit.
    if (HAS_UNRESOLVED_TOKEN_INPUT) {
        logger.error("NTFY_TOKEN is an unresolved ${input:…} reference: the server received the placeholder itself (from your MCP client config or ./.env) instead of your token. Set NTFY_TOKEN to the token itself (or to a reference your client resolves, such as an environment variable), or remove it for public topics. Exiting.");
        process.exit(1);
    }
    // Sent as a bearer token, a placeholder makes ntfy servers with auth enabled
    // (ntfy.sh among them) answer 401 to every request, even on public topics.
    if (HAS_UNRESOLVED_TOKEN_PLACEHOLDER) {
        logger.error("NTFY_TOKEN contains an unresolved ${…} placeholder: your MCP client (or ./.env) passed the placeholder text instead of substituting it, and ntfy servers with auth enabled (such as ntfy.sh) reject it on every request. Set NTFY_TOKEN to the token itself (or to a reference your client resolves), or remove it for public topics. Exiting.");
        process.exit(1);
    }
    if (NTFY_TOKEN) {
        logger.info(`Using configured access token for ${NTFY_URL}/${NTFY_TOPIC}.`);
    }
    else {
        logger.info(`No NTFY_TOKEN configured for ${NTFY_URL}/${NTFY_TOPIC}. Assuming the topic is public unless an accessToken is supplied per request.`);
    }
    // NTFY_TOPICS_ALLOWLIST (#34): when set, the agent may choose NTFY_TOPIC or
    // one of these topics, and nothing else (this wins over the topic override).
    let topicsAllowlist;
    try {
        topicsAllowlist = parseTopicAllowlist(process.env.NTFY_TOPICS_ALLOWLIST);
    }
    catch (error) {
        logger.error(`${error instanceof Error ? error.message : String(error)} Exiting.`);
        process.exit(1);
    }
    const allowedTopics = topicsAllowlist.length > 0 ? [...new Set([defaultTopic, ...topicsAllowlist])] : [];
    const destinationPolicy = {
        allowTopicOverride: NTFY_ALLOW_TOPIC_OVERRIDE,
        allowUrlOverride: NTFY_ALLOW_URL_OVERRIDE,
        allowedTopics,
    };
    if (allowedTopics.length > 0) {
        logger.info(`Topics limited to NTFY_TOPIC and NTFY_TOPICS_ALLOWLIST: ${allowedTopics.join(", ")}.`);
        if (NTFY_ALLOW_TOPIC_OVERRIDE) {
            logger.warn("NTFY_TOPICS_ALLOWLIST is set, so NTFY_ALLOW_TOPIC_OVERRIDE is ignored: tools can only choose an allowlisted topic.");
        }
    }
    else {
        logger.info(NTFY_ALLOW_TOPIC_OVERRIDE
            ? "Topic overrides enabled (NTFY_ALLOW_TOPIC_OVERRIDE): tools accept a per-call topic."
            : `Topic locked to NTFY_TOPIC (${NTFY_TOPIC}). Set NTFY_ALLOW_TOPIC_OVERRIDE=true to let tools choose a topic.`);
    }
    logger.info(NTFY_ALLOW_URL_OVERRIDE
        ? "Server URL overrides enabled (NTFY_ALLOW_URL_OVERRIDE): tools accept a per-call url; NTFY_TOKEN is still only sent to NTFY_URL."
        : `Server locked to NTFY_URL (${NTFY_URL}). Set NTFY_ALLOW_URL_OVERRIDE=true to let tools choose a server.`);
    const { handleNotifyTool, handleFetchTool } = createToolHandlers({
        getDefaultTopic: () => NTFY_TOPIC,
        getDefaultUrl: () => NTFY_URL,
        getDefaultToken: () => NTFY_TOKEN,
        ...destinationPolicy,
    });
    // Create the MCP server
    const server = new McpServer({
        name: "ntfy-me-mcp",
        version: packageJson.version,
    });
    server.registerTool("ntfy_me", {
        title: "Send ntfy notification",
        description: "Send a notification to the user via ntfy. Use this tool when the user asks to 'send a notification', 'notify me', 'send me an alert', 'message me', 'ping me', or any similar request. This tool is perfect for sending status updates, alerts, reminders, or notifications about completed tasks.",
        inputSchema: createNotifyToolInputSchema(destinationPolicy),
    }, handleNotifyTool);
    server.registerTool("ntfy_me_fetch", {
        title: "Fetch ntfy messages",
        description: "Fetch cached messages from an ntfy server topic. Use this tool when the user asks to 'show notifications', 'get my messages', 'show my alerts', 'find notifications', 'search notifications', or any similar request. Great for finding recent notifications, checking message history, or searching for specific notifications by content, title, tags, or priority.",
        inputSchema: createFetchToolInputSchema(destinationPolicy),
    }, handleFetchTool);
    // Start the server with stdio transport
    const transport = new StdioServerTransport();
    server
        .connect(transport)
        .then(() => logger.info("ntfy-me-mcp running on stdio"))
        .catch((err) => logger.error(`Failed to start server: ${err}`));
}
// Start the server initialization process
initializeServer().catch((err) => {
    logger.error(`Initialization error: ${err}`);
    process.exit(1);
});
