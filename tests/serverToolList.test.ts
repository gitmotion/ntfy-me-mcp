import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Spawns the compiled server (CI runs `npm run build` before `npm test`) to
// pin the env → schema wiring in src/index.ts (#21).
const entry = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "index.js");

type JsonRpcResponse = {
    id: number;
    result?: {
        tools?: Array<{ name: string; inputSchema: { properties: Record<string, { enum?: string[] }> } }>;
        isError?: boolean;
        content?: Array<{ text: string }>;
    };
};

function spawnServer(extraEnv: Record<string, string>) {
    return spawn(process.execPath, [entry], {
        // Run outside the repo so a contributor's local .env can't change the flags.
        cwd: tmpdir(),
        env: {
            PATH: process.env.PATH,
            NTFY_TOPIC: "tool_list_probe",
            NTFY_URL: "http://127.0.0.1:9",
            NTFY_ALLOW_TOPIC_OVERRIDE: "false",
            NTFY_ALLOW_URL_OVERRIDE: "false",
            ...extraEnv,
        },
        stdio: ["pipe", "pipe", "pipe"],
    });
}

// Initializes an MCP session, sends `requests` (ids from 2), and returns the responses by id.
async function exchange(extraEnv: Record<string, string>, requests: Array<{ method: string; params?: object }>) {
    const child = spawnServer(extraEnv);

    try {
        let stderr = "";
        child.stderr.on("data", (chunk) => (stderr += chunk));
        const responses = await new Promise<Map<number, JsonRpcResponse>>((resolve, reject) => {
            const responses = new Map<number, JsonRpcResponse>();
            let buffer = "";
            const timer = setTimeout(() => reject(new Error("missing JSON-RPC responses")), 4000);
            child.stdout.on("data", (chunk) => {
                buffer += chunk;
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines.filter(Boolean)) {
                    const message = JSON.parse(line) as JsonRpcResponse;
                    responses.set(message.id, message);
                }
                if (requests.every((_, index) => responses.has(index + 2))) {
                    clearTimeout(timer);
                    resolve(responses);
                }
            });
            const send = (message: object) => child.stdin.write(`${JSON.stringify(message)}\n`);
            send({
                jsonrpc: "2.0",
                id: 1,
                method: "initialize",
                params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
            });
            send({ jsonrpc: "2.0", method: "notifications/initialized" });
            requests.forEach((request, index) => send({ jsonrpc: "2.0", id: index + 2, ...request }));
        });
        return { responses, stderr };
    } finally {
        child.kill();
    }
}

async function listTools(extraEnv: Record<string, string>) {
    const { responses } = await exchange(extraEnv, [{ method: "tools/list" }]);
    return responses.get(2)?.result?.tools ?? [];
}

async function listToolProperties(extraEnv: Record<string, string>) {
    const tools = await listTools(extraEnv);
    return Object.fromEntries(tools.map((tool) => [tool.name, Object.keys(tool.inputSchema.properties)]));
}

// For configurations that should stop the server before it starts serving.
async function startupFailure(extraEnv: Record<string, string>) {
    const child = spawnServer(extraEnv);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    const exitCode = await new Promise<number | null>((resolve) => {
        const timer = setTimeout(() => {
            child.kill();
            resolve(null);
        }, 4000);
        child.once("close", (code) => {
            clearTimeout(timer);
            resolve(code);
        });
    });

    return { exitCode, stdout, stderr };
}

describe("server tool list and destination overrides (#21)", () => {
    it("offers neither topic nor url by default", async () => {
        const tools = await listToolProperties({});

        for (const name of ["ntfy_me", "ntfy_me_fetch"]) {
            expect(tools[name]).not.toContain("topic");
            expect(tools[name]).not.toContain("url");
        }
    });

    it("offers topic only when NTFY_ALLOW_TOPIC_OVERRIDE=true", async () => {
        const tools = await listToolProperties({ NTFY_ALLOW_TOPIC_OVERRIDE: "true" });

        for (const name of ["ntfy_me", "ntfy_me_fetch"]) {
            expect(tools[name]).toContain("topic");
            expect(tools[name]).not.toContain("url");
        }
    });

    it("offers url only when NTFY_ALLOW_URL_OVERRIDE=true", async () => {
        const tools = await listToolProperties({ NTFY_ALLOW_URL_OVERRIDE: "true" });

        for (const name of ["ntfy_me", "ntfy_me_fetch"]) {
            expect(tools[name]).toContain("url");
            expect(tools[name]).not.toContain("topic");
        }
    });
});

describe("server tool list and the topic allowlist (#34)", () => {
    it("offers topic as an enum of NTFY_TOPIC plus NTFY_TOPICS_ALLOWLIST on both tools", async () => {
        const tools = await listTools({ NTFY_TOPIC: " tool_list_probe ", NTFY_TOPICS_ALLOWLIST: " alerts, builds ,alerts" });

        for (const name of ["ntfy_me", "ntfy_me_fetch"]) {
            const tool = tools.find((candidate) => candidate.name === name);
            expect(tool?.inputSchema.properties.topic?.enum).toEqual(["tool_list_probe", "alerts", "builds"]);
            expect(Object.keys(tool?.inputSchema.properties ?? {})).not.toContain("url");
        }
    });

    it("keeps the enum when NTFY_ALLOW_TOPIC_OVERRIDE is also set, and says the override is ignored", async () => {
        const { responses, stderr } = await exchange(
            { NTFY_TOPICS_ALLOWLIST: "alerts", NTFY_ALLOW_TOPIC_OVERRIDE: "true" },
            [{ method: "tools/list" }]
        );

        for (const tool of responses.get(2)?.result?.tools ?? []) {
            expect(tool.inputSchema.properties.topic?.enum).toEqual(["tool_list_probe", "alerts"]);
        }
        expect(stderr).toContain("NTFY_TOPICS_ALLOWLIST is set, so NTFY_ALLOW_TOPIC_OVERRIDE is ignored");
    });

    it("routes an allowlisted topic to that topic for both tools (no fallback to NTFY_TOPIC)", async () => {
        const { stderr } = await exchange({ NTFY_TOPICS_ALLOWLIST: "alerts" }, [
            { method: "tools/call", params: { name: "ntfy_me", arguments: { title: "T", message: "m", topic: "alerts" } } },
            { method: "tools/call", params: { name: "ntfy_me_fetch", arguments: { topic: "alerts" } } },
        ]);

        expect(stderr).toContain("Sending notification to http://127.0.0.1:9/alerts");
        expect(stderr).toContain("Fetching messages for topic alerts");
        expect(stderr).not.toContain("Ignoring the per-call topic");
    });

    it("rejects a topic outside the allowlist over MCP before any request is made", async () => {
        const { responses } = await exchange({ NTFY_TOPICS_ALLOWLIST: "alerts" }, [
            { method: "tools/call", params: { name: "ntfy_me", arguments: { title: "T", message: "m", topic: "unfollowed_topic" } } },
            { method: "tools/call", params: { name: "ntfy_me_fetch", arguments: { topic: "unfollowed_topic" } } },
        ]);

        for (const id of [2, 3]) {
            const result = responses.get(id)?.result;
            expect(result?.isError).toBe(true);
            expect(result?.content?.[0].text).toMatch(/^MCP error -32602: Input validation error/);
            expect(result?.content?.[0].text).not.toContain("unfollowed_topic");
        }
    });

    it("fails at startup on an invalid allowlist entry, naming the variable", async () => {
        const { exitCode, stdout, stderr } = await startupFailure({ NTFY_TOPICS_ALLOWLIST: "alerts,not a topic" });

        expect(exitCode).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain("Invalid NTFY_TOPICS_ALLOWLIST entry 2: topic may only contain");
        expect(stderr).not.toContain("running on stdio");
    });
});
