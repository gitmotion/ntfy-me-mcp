import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Spawns the compiled server (CI runs `npm run build` before `npm test`).
const entry = join(dirname(fileURLToPath(import.meta.url)), "..", "build", "index.js");

async function startAndStop(cwd: string, env: Record<string, string>) {
    const child = spawn(process.execPath, [entry], {
        cwd,
        env: { PATH: process.env.PATH, ...env },
        stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));

    try {
        await new Promise<void>((resolve, reject) => {
            // Shorter than vitest's 5 s default so a hung start reports the server's stderr.
            const timer = setTimeout(() => reject(new Error(`server did not start: ${stderr}`)), 4000);
            child.once("exit", (code) => {
                clearTimeout(timer);
                reject(new Error(`server exited (${code}) before it was ready: ${stderr}`));
            });
            child.stderr.on("data", () => {
                if (stderr.includes("running on stdio")) {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });
    } finally {
        child.kill();
        await closed;
    }

    return { stdout, stderr };
}

describe("dotenv can't interfere with the MCP channel or the client's config", () => {
    let workDir: string | undefined;

    afterEach(() => {
        if (workDir) rmSync(workDir, { recursive: true, force: true });
        workDir = undefined;
    });

    it("writes nothing to stdout at startup, even with a .env and dotenv debug env vars set", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-stdout-"));
        writeFileSync(join(workDir, ".env"), "NTFY_TOPIC=from_dotenv\nEXTRA_VALUE=1\n");

        const { stdout } = await startAndStop(workDir, {
            NTFY_TOPIC: "stdout_probe",
            NTFY_URL: "http://127.0.0.1:9",
            DOTENV_DEBUG: "true",
            DOTENV_CONFIG_DEBUG: "true",
            DOTENV_CONFIG_QUIET: "false",
        });

        expect(stdout).toBe("");
    });

    it("keeps the client's env over a .env, even with DOTENV_OVERRIDE / DOTENV_CONFIG_OVERRIDE set", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-override-"));
        writeFileSync(join(workDir, ".env"), "NTFY_URL=http://dotenv.invalid\nNTFY_TOPIC=dotenv_topic\n");

        const { stderr } = await startAndStop(workDir, {
            NTFY_TOPIC: "client_topic",
            NTFY_URL: "http://127.0.0.1:9",
            DOTENV_OVERRIDE: "true",
            DOTENV_CONFIG_OVERRIDE: "true",
        });

        expect(stderr).toContain("http://127.0.0.1:9/client_topic");
        expect(stderr).not.toContain("dotenv.invalid");
    });

    it("loads ./.env from the working directory", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-load-"));
        // The client doesn't set NTFY_TOPIC, so only ./.env can supply it.
        writeFileSync(join(workDir, ".env"), "NTFY_TOPIC=from_dotenv\n");

        const { stderr } = await startAndStop(workDir, { NTFY_URL: "http://127.0.0.1:9" });

        expect(stderr).toContain("http://127.0.0.1:9/from_dotenv");
    });

    it("reads ./.env as UTF-8, ignoring DOTENV_ENCODING", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-encoding-"));
        // A non-ASCII value only survives a UTF-8 read (latin1 would turn ü into Ã¼).
        writeFileSync(join(workDir, ".env"), "NTFY_URL=http://bücher.invalid\nNTFY_TOPIC=from_dotenv\n", "utf8");

        const { stderr } = await startAndStop(workDir, {
            DOTENV_ENCODING: "utf16le",
            DOTENV_CONFIG_ENCODING: "utf16le",
        });

        expect(stderr).toContain("http://bücher.invalid/from_dotenv");
    });

    it("only reads ./.env, ignoring DOTENV_PATH", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-path-"));
        // The client doesn't set NTFY_URL, so only a loaded other.env could supply it.
        writeFileSync(join(workDir, "other.env"), "NTFY_URL=http://from-other-file.invalid\n");

        const { stderr } = await startAndStop(workDir, {
            NTFY_TOPIC: "client_topic",
            DOTENV_PATH: join(workDir, "other.env"),
            DOTENV_CONFIG_PATH: join(workDir, "other.env"),
        });

        expect(stderr).toContain("https://ntfy.sh/client_topic");
        expect(stderr).not.toContain("from-other-file");
    });
});
