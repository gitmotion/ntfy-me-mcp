import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const entry = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "build", "index.js");

export interface McpSession {
    client: Client;
    /** Everything the server wrote to stderr so far. */
    stderr(): string;
    /** Transport/protocol errors, e.g. a non-JSON-RPC line on stdout. */
    errors: Error[];
    close(): Promise<void>;
}

/**
 * Starts build/index.js the way an MCP client does (stdio), with only the
 * given env (plus PATH), from a fresh empty directory so no .env applies.
 */
export async function connect(env: Record<string, string>): Promise<McpSession> {
    if (!env.NTFY_URL) {
        // Without it the server would default to the public ntfy.sh.
        throw new Error("e2e sessions need an explicit NTFY_URL");
    }
    const cwd = mkdtempSync(join(tmpdir(), "ntfy-me-e2e-"));
    const removeCwd = () => rmSync(cwd, { recursive: true, force: true });
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [entry],
        cwd,
        env: { PATH: process.env.PATH ?? "", ...env },
        stderr: "pipe",
    });
    let stderr = "";
    transport.stderr?.on("data", (chunk) => (stderr += chunk));

    const errors: Error[] = [];
    const client = new Client({ name: "ntfy-me-e2e", version: "0.0.0" });
    client.onerror = (error) => errors.push(error);
    try {
        await client.connect(transport);
    } catch (error) {
        try {
            removeCwd();
        } catch {
            // the server may still be exiting (EBUSY on Windows); keep the real error
        }
        throw error;
    }

    return {
        client,
        stderr: () => stderr,
        errors,
        close: async () => {
            await client.close();
            removeCwd();
        },
    };
}

export interface ToolResult {
    isError?: boolean;
    content: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
}

export async function callTool(session: McpSession, name: string, args: Record<string, unknown>): Promise<ToolResult> {
    return (await session.client.callTool({ name, arguments: args })) as ToolResult;
}

/** A topic no other test (or earlier run) uses. */
export function uniqueTopic(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

export interface NtfyMessage {
    id: string;
    event: string;
    topic: string;
    title?: string;
    message?: string;
    priority?: number;
    tags?: string[];
    content_type?: string;
    actions?: Array<{ action: string; label: string; url?: string }>;
    click?: string;
}

/** Reads a topic through ntfy's own API, independently of the server under test. */
export async function pollTopic(url: string, topic: string, token?: string): Promise<NtfyMessage[]> {
    const response = await fetch(`${url}/${topic}/json?poll=1&since=all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
        throw new Error(`poll ${topic} failed: ${response.status}`);
    }
    return (await response.text())
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as NtfyMessage)
        .filter((message) => message.event === "message");
}

/** Publishes directly to ntfy (JSON body, so non-ASCII needs no header encoding). */
export async function publishDirect(
    url: string,
    message: { topic: string; message: string; title?: string; priority?: number; tags?: string[] }
): Promise<NtfyMessage> {
    const response = await fetch(url, { method: "POST", body: JSON.stringify(message) });
    if (!response.ok) {
        throw new Error(`publish to ${message.topic} failed: ${response.status}`);
    }
    return (await response.json()) as NtfyMessage;
}
