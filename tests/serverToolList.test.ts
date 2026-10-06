import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Spawns the compiled server (CI runs `npm run build` before `npm test`) to
// pin the env → schema wiring in src/index.ts (#21).
const entry = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "index.js");

async function listToolProperties(extraEnv: Record<string, string>) {
    const child = spawn(process.execPath, [entry], {
        env: {
            PATH: process.env.PATH,
            NTFY_TOPIC: "tool_list_probe",
            NTFY_URL: "http://127.0.0.1:9",
            ...extraEnv,
        },
        stdio: ["pipe", "pipe", "pipe"],
    });

    try {
        const response = await new Promise<{ result: { tools: Array<{ name: string; inputSchema: { properties: Record<string, unknown> } }> } }>(
            (resolve, reject) => {
                let buffer = "";
                const timer = setTimeout(() => reject(new Error("no tools/list response")), 5000);
                child.stdout.on("data", (chunk) => {
                    buffer += chunk;
                    for (const line of buffer.split("\n")) {
                        if (line.includes('"id":2')) {
                            clearTimeout(timer);
                            resolve(JSON.parse(line));
                        }
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
                send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
            }
        );

        return Object.fromEntries(
            response.result.tools.map((tool) => [tool.name, Object.keys(tool.inputSchema.properties)])
        );
    } finally {
        child.kill();
    }
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
