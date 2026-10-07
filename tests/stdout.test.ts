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
            const timer = setTimeout(() => reject(new Error(`server did not start: ${stderr}`)), 5000);
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

async function runAndExpectExit(env: Record<string, string>) {
    const child = spawn(process.execPath, [entry], {
        env: { PATH: process.env.PATH, ...env },
        stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    const code = await new Promise<number | null>((resolve) => child.once("close", resolve));
    return { code, stdout, stderr };
}

describe("startup configuration validation", () => {
    it("fails fast with exit code 1 when NTFY_TOPIC is missing", async () => {
        const { code, stderr } = await runAndExpectExit({});
        expect(code).toBe(1);
        expect(stderr).toContain("NTFY_TOPIC environment variable is required");
    });

    it("fails fast with exit code 1 when NTFY_TOPIC contains invalid characters", async () => {
        const { code, stderr } = await runAndExpectExit({
            NTFY_TOPIC: "topic with spaces",
        });
        expect(code).toBe(1);
        expect(stderr).toContain(
            "Invalid NTFY_TOPIC: topic may only contain letters, numbers, underscores, and hyphens"
        );
    });

    it("fails fast with exit code 1 when NTFY_URL is invalid", async () => {
        const { code, stderr } = await runAndExpectExit({
            NTFY_TOPIC: "valid_topic",
            NTFY_URL: "not-a-url",
        });
        expect(code).toBe(1);
        expect(stderr).toContain("Invalid NTFY_URL: not a valid URL");
    });

    it("fails fast and does not leak credentials when NTFY_URL embeds user:pass", async () => {
        const { code, stderr } = await runAndExpectExit({
            NTFY_TOPIC: "valid_topic",
            NTFY_URL: "https://admin:secret123@ntfy.example.com",
        });
        expect(code).toBe(1);
        expect(stderr).toContain("Invalid NTFY_URL: credentials in the URL are not supported");
        expect(stderr).not.toContain("secret123");
        expect(stderr).not.toContain("admin:secret123");
    });
});

