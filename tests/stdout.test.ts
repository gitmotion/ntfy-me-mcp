import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Spawns the compiled server (CI runs `npm run build` before `npm test`).
const entry = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "index.js");

describe("stdout carries only JSON-RPC", () => {
    let workDir: string | undefined;

    afterEach(() => {
        if (workDir) rmSync(workDir, { recursive: true, force: true });
        workDir = undefined;
    });

    it("writes nothing to stdout at startup, even with a .env and dotenv debug env vars set", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-stdout-"));
        writeFileSync(join(workDir, ".env"), "NTFY_TOPIC=from_dotenv\nEXTRA_VALUE=1\n");

        const child = spawn(process.execPath, [entry], {
            cwd: workDir,
            env: {
                PATH: process.env.PATH,
                NTFY_TOPIC: "stdout_probe",
                NTFY_URL: "http://127.0.0.1:9",
                DOTENV_DEBUG: "true",
                DOTENV_CONFIG_DEBUG: "true",
                DOTENV_CONFIG_QUIET: "false",
            },
            stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => (stdout += chunk));
        child.stderr.on("data", (chunk) => (stderr += chunk));

        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`server did not start: ${stderr}`)), 5000);
            child.stderr.on("data", () => {
                if (stderr.includes("running on stdio")) {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });
        child.kill();

        expect(stdout).toBe("");
    });
});
