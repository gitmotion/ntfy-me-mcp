#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as dotenv from "dotenv";
import prompts from "prompts";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { fetchToolInputSchema, } from "./schemas/fetchTool.schema.js";
import { notifyToolInputSchema, } from "./schemas/notifyTool.schema.js";
import { isUnresolvedInputReference, } from "./utils/validation.js";
import { createToolHandlers } from "./utils/toolHandlers.js";
import { Logger } from "./utils/logger.js";
const logger = Logger.getInstance();
// Get package.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
dotenv.config({ quiet: true });
const NTFY_TOPIC = process.env.NTFY_TOPIC;
const NTFY_URL = process.env.NTFY_URL || "https://ntfy.sh";
const RAW_NTFY_TOKEN = process.env.NTFY_TOKEN?.trim() ?? "";
const HAS_UNRESOLVED_TOKEN_INPUT = isUnresolvedInputReference(RAW_NTFY_TOKEN);
let NTFY_TOKEN = HAS_UNRESOLVED_TOKEN_INPUT ? "" : RAW_NTFY_TOKEN;
const { handleNotifyTool, handleFetchTool } = createToolHandlers({
    getDefaultTopic: () => NTFY_TOPIC,
    getDefaultUrl: () => NTFY_URL,
    getDefaultToken: () => NTFY_TOKEN,
});
async function initializeServer() {
    if (!NTFY_TOPIC) {
        logger.error("NTFY_TOPIC environment variable is required. Please ensure it's added to your .env file or passed as an environment variable.");
        process.exit(1);
    }
    if (HAS_UNRESOLVED_TOKEN_INPUT && !NTFY_TOKEN) {
        logger.info(`NTFY_TOKEN is configured as an input reference. Prompting for an access token for ${NTFY_URL}/${NTFY_TOPIC}.`);
        try {
            const response = await prompts({
                type: "password",
                name: "token",
                message: `Enter access token for ${NTFY_URL}/${NTFY_TOPIC}:`,
            }, {
                onCancel: () => {
                    logger.error("Authentication token is required for protected topics. Exiting.");
                    process.exit(1);
                },
            });
            NTFY_TOKEN = response.token || "";
            if (!NTFY_TOKEN) {
                logger.error("No token provided for protected topic. Exiting.");
                process.exit(1);
            }
            logger.info("Token provided. Proceeding with authentication.");
        }
        catch (error) {
            logger.error(`Error while prompting for token: ${error}`);
            process.exit(1);
        }
    }
    else if (NTFY_TOKEN) {
        logger.info(`Using configured access token for ${NTFY_URL}/${NTFY_TOPIC}.`);
    }
    else {
        logger.info(`No NTFY_TOKEN configured for ${NTFY_URL}/${NTFY_TOPIC}. Assuming the topic is public unless an accessToken is supplied per request.`);
    }
    // Create the MCP server
    const server = new McpServer({
        name: "ntfy-me-mcp",
        version: packageJson.version,
    });
    server.registerTool("ntfy_me", {
        title: "Send ntfy notification",
        description: "Send a notification to the user via ntfy. Use this tool when the user asks to 'send a notification', 'notify me', 'send me an alert', 'message me', 'ping me', or any similar request. This tool is perfect for sending status updates, alerts, reminders, or notifications about completed tasks.",
        inputSchema: notifyToolInputSchema,
    }, handleNotifyTool);
    server.registerTool("ntfy_me_fetch", {
        title: "Fetch ntfy messages",
        description: "Fetch cached messages from an ntfy server topic. Use this tool when the user asks to 'show notifications', 'get my messages', 'show my alerts', 'find notifications', 'search notifications', or any similar request. Great for finding recent notifications, checking message history, or searching for specific notifications by content, title, tags, or priority.",
        inputSchema: fetchToolInputSchema,
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
