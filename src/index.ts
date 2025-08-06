#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import prompts from "prompts";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";
import { detectMarkdown } from "./utils/markdown.js";
import { processActions } from "./utils/actions.js";
import { fetchMessages } from "./utils/messages.js";

// Get package.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

dotenv.config();

const NTFY_TOPIC = process.env.NTFY_TOPIC;
const NTFY_URL = process.env.NTFY_URL || "https://ntfy.sh";
let NTFY_TOKEN = process.env.NTFY_TOKEN || "";
// Check if topic requires authentication (defaults to false for backward compatibility)
const PROTECTED_TOPIC = process.env.PROTECTED_TOPIC === "true" || false;

async function initializeServer() {
  if (!NTFY_TOPIC) {
    console.error(
      "Error: NTFY_TOPIC environment variable is required. Please ensure it's added to your .env file or passed as an environment variable.",
    );
    process.exit(1);
  }
  
  // Prompt for token if topic is protected and no token is provided
  if (PROTECTED_TOPIC && !NTFY_TOKEN) {
    console.log(`Topic '${NTFY_TOPIC}' is marked as protected and requires authentication.`);
    try {
      const response = await prompts({
        type: 'password',
        name: 'token',
        message: `Enter access token for ${NTFY_URL}/${NTFY_TOPIC}:`,
      }, {
        onCancel: () => {
          console.error('Authentication token is required for protected topics. Exiting.');
          process.exit(1);
        }
      });
      
      NTFY_TOKEN = response.token || "";
      if (!NTFY_TOKEN) {
        console.error('No token provided for protected topic. Exiting.');
        process.exit(1);
      }
      console.log('Token provided. Proceeding with authentication.');
    } catch (error) {
      console.error('Error while prompting for token:', error);
      process.exit(1);
    }
  } else if (!PROTECTED_TOPIC) {
    // For non-protected topics, log that we're assuming it's public
    console.log(`Topic '${NTFY_TOPIC}' is marked as public. No authentication required.`);
  }

  // Create the MCP server
  const server = new McpServer({
    name: "ntfy-me-mcp",
    version: packageJson.version,
  });

  // Add the notify_user tool
  server.tool(
    "ntfy_me",
    "Send a notification to the user via ntfy. Use this tool when the user asks to 'send a notification', 'notify me', 'send me an alert', 'message me', 'ping me', or any similar request. This tool is perfect for sending status updates, alerts, reminders, or notifications about completed tasks.",
    {
      taskTitle: z.string().describe("Current task title/status"),
      taskSummary: z.string().describe("Current task summary"),
      ntfyUrl: z.string().optional().describe("Optional custom ntfy URL (defaults to NTFY_URL env var or https://ntfy.sh)"),
      ntfyTopic: z.string().optional().describe("Optional custom ntfy topic (defaults to NTFY_TOPIC env var)"),
      accessToken: z.string().optional().describe("Optional access token for authentication (defaults to NTFY_TOKEN env var)"),
      priority: z.enum(["min", "low", "default", "high", "max"]).optional().describe("Message priority level"),
      tags: z.array(z.string()).optional().describe("Tags for the notification"),
      markdown: z.boolean().optional().describe("Whether to format the message with Markdown support"),
      actions: z.array(z.object({
        action: z.literal("view"),
        label: z.string(),
        url: z.string(),
        clear: z.boolean().optional()
      })).optional().describe("Optional array of view actions to add to the notification"),
    },
    async ({ taskTitle, taskSummary, ntfyUrl, ntfyTopic, accessToken, priority, tags, markdown, actions }) => {
      try {
        const url = ntfyUrl || NTFY_URL;
        const topic = ntfyTopic || NTFY_TOPIC;
        const token = accessToken || NTFY_TOKEN;
        
        // Create endpoint URL - handle URLs with or without trailing slash
        const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
        const endpoint = `${baseUrl}/${topic}`;

        // Prepare headers
        const headers: Record<string, string> = { 
          'Title': taskTitle
        };
        
        // Add access token if provided
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        
        // Add priority if specified
        if (priority) {
          headers.Priority = priority;
        }

        // Process URLs in the message and get actions if none provided
        const viewActions = actions || processActions(taskSummary);
        
        // Auto-detect markdown if not explicitly specified
        const shouldUseMarkdown = markdown !== undefined ? markdown : detectMarkdown(taskSummary);
        
        // Add Markdown formatting if specified or detected
        if (shouldUseMarkdown) {
          headers["X-Markdown"] = "true";
        }
        
        // Add tags if specified
        if (tags && tags.length > 0) {
          headers.Tags = tags.join(",");
        }

        // Add actions to X-Actions header if we have any
        if (viewActions.length > 0) {
          headers["X-Actions"] = JSON.stringify(viewActions);
        }
        
        // Remove any newlines from endpoint string
        const cleanEndpoint = endpoint.trim();
        
        console.log(
          `Sending notification to ${cleanEndpoint}` +
          `${shouldUseMarkdown ? " with Markdown formatting" : ""}` +
          `${viewActions.length > 0 ? ` and ${viewActions.length} view action(s)` : ""}`
        );
        
        const response = await fetch(cleanEndpoint, {
          method: "POST",
          body: taskSummary,
          headers
        });

        if (!response.ok) {
          // Check specifically for authentication errors
          if (response.status === 401 || response.status === 403) {
            const serverName = new URL(url).hostname;
            throw new Error(
              `Authentication failed when sending notification to ${serverName}/${topic}. ` +
              `This ntfy topic requires an access token. Please provide a token using the 'accessToken' parameter ` +
              `or set the NTFY_TOKEN environment variable.`
            );
          }
          
          // Handle other errors
          throw new Error(
            `Failed to send ntfy notification. Status code: ${response.status}, Message: ${await response.text()}`
          );
        }

        return {
          content: [
            {
              type: "text",
              text: `Notification sent successfully to ${cleanEndpoint}!`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to send ntfy notification: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Add the ntfy_me_fetch tool to fetch cached messages
  server.tool(
    "ntfy_me_fetch",
    "Fetch cached messages from an ntfy server topic. Use this tool when the user asks to 'show notifications', 'get my messages', 'show my alerts', 'find notifications', 'search notifications', or any similar request. Great for finding recent notifications, checking message history, or searching for specific notifications by content, title, tags, or priority.",
    {
      ntfyUrl: z.string().optional().describe("Optional custom ntfy server URL (defaults to NTFY_URL env var or https://ntfy.sh)"),
      ntfyTopic: z.string().optional().describe("Optional custom ntfy topic/channel to get messages from (defaults to NTFY_TOPIC env var)"),
      accessToken: z.string().optional().describe("Optional access token for authentication (defaults to NTFY_TOKEN env var)"),
      since: z.union([z.string(), z.number()]).optional().describe("How far back to retrieve messages: timespan (e.g., '10m', '1h', '1d'), timestamp, message ID, or 'all' for all messages. Default: 10 minutes"),
      messageId: z.string().optional().describe("Find a specific message by its ID"),
      messageText: z.string().optional().describe("Find messages containing this exact text content"),
      messageTitle: z.string().optional().describe("Find messages with this exact title/subject"),
      priorities: z.union([z.string(), z.array(z.string())]).optional().describe("Find messages with specific priority levels (min, low, default, high, max)"),
      tags: z.union([z.string(), z.array(z.string())]).optional().describe("Find messages with specific tags (e.g., 'error', 'warning', 'success')"),
    },
    async ({ ntfyUrl, ntfyTopic, accessToken, since, messageId, messageText, messageTitle, priorities, tags }) => {
      try {
        const url = ntfyUrl || NTFY_URL;
        const topic = ntfyTopic || NTFY_TOPIC;
        const token = accessToken || NTFY_TOKEN;
        
        // Default since to 10 minutes if not null
        const sinceSetting = since === null ? undefined : (since || "10m");
        
        // Fetch the messages with any provided filters
        const messageRecords = await fetchMessages({
          ntfyUrl: url,
          topic,
          token,
          since: sinceSetting,
          messageId,
          messageText,
          messageTitle,
          priorities,
          tags
        });
        
        if (!messageRecords) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No messages found in topic ${topic}`,
              },
            ],
          };
        }
        
        // Format the response
        const messagesCount = Object.values(messageRecords).reduce((sum, messages) => sum + messages.length, 0);
        const formattedMessages = Object.entries(messageRecords).map(([topic, messages]) => {
          return {
            type: "text" as const,
            text: `Topic: ${topic}\nMessages: ${messages.length}\n${JSON.stringify(messages, null, 2)}`
          };
        });
        
        return {
          content: [
            {
              type: "text" as const,
              text: `Successfully fetched ${messagesCount} message(s) from ${Object.keys(messageRecords).length} topic(s)`,
            },
            ...formattedMessages
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to fetch ntfy messages: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Start the server with stdio transport
  const transport = new StdioServerTransport();
  server
    .connect(transport)
    .then(() => console.error("ntfy-me-mcp running on stdio"))
    .catch((err) => console.error("Failed to start server:", err));
}

// Start the server initialization process
initializeServer().catch(err => {
  console.error("Initialization error:", err);
  process.exit(1);
});
