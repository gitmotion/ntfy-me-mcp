import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Spawns the compiled server (CI runs `npm run build` before `npm test`).
const testsDir = dirname(fileURLToPath(import.meta.url));
const entry = join(testsDir, "..", "build", "index.js");
// `node --import` preload that reports any read of stdin on stderr (see the fixture).
const STDIN_TRAP = ["--import", pathToFileURL(join(testsDir, "fixtures", "stdin-trap.mjs")).href];
const STDIN_TRAP_LOADED = "STDIN_TRAP_LOADED";
const STDIN_TOUCHED = "STDIN_TOUCHED";

async function startAndStop(cwd: string, env: Record<string, string>, nodeArgs: string[] = []) {
    const child = spawn(process.execPath, [...nodeArgs, entry], {
        cwd,
        env: { PATH: process.env.PATH, ...env },
        stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));

    try {
        await new Promise<void>((resolve, reject) => {
            // Shorter than vitest's 5 s default so a hung start reports the server's stderr.
            const timer = setTimeout(() => reject(new Error(`server did not start: ${stderr}`)), 4000);
            // "close" (not "exit") fires after stderr is drained, so the message has all of it.
            void closed.then(() => {
                clearTimeout(timer);
                reject(new Error(`server exited (${child.exitCode ?? child.signalCode}) before it was ready: ${stderr}`));
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

// Starts the server like an MCP client does: writes the client's first message
// and keeps stdin open. Waits up to 4 s for the server to exit on its own.
async function runUntilExit(
    cwd: string,
    env: Record<string, string>,
    clientMessage: string,
    nodeArgs: string[] = []
) {
    const child = spawn(process.execPath, [...nodeArgs, entry], {
        cwd,
        env: { PATH: process.env.PATH, ...env },
        stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    const closed = new Promise<void>((resolve) => child.once("close", () => resolve()));
    // The server may exit before the write lands; that EPIPE isn't the test's concern.
    child.stdin.on("error", () => {});
    child.stdin.write(clientMessage);

    let timer: NodeJS.Timeout | undefined;
    const exitedOnItsOwn = await Promise.race([
        closed.then(() => true),
        new Promise<boolean>((resolve) => (timer = setTimeout(() => resolve(false), 4000))),
    ]);
    clearTimeout(timer);
    if (!exitedOnItsOwn) {
        child.kill();
        await closed;
    }

    return { exitedOnItsOwn, exitCode: child.exitCode, stdout, stderr };
}

const INITIALIZE_REQUEST =
    JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
    }) + "\n";

describe("an unresolved ${input:…} NTFY_TOKEN", () => {
    let workDir: string | undefined;

    afterEach(() => {
        if (workDir) rmSync(workDir, { recursive: true, force: true });
        workDir = undefined;
    });

    it("exits at startup with a clear error, writing nothing to stdout and leaving stdin unread", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-input-ref-"));

        const result = await runUntilExit(
            workDir,
            { NTFY_TOPIC: "input_ref", NTFY_URL: "http://127.0.0.1:9", NTFY_TOKEN: "${input:ntfy_token}" },
            INITIALIZE_REQUEST,
            STDIN_TRAP
        );

        expect(result.stdout).toBe("");
        expect(result.exitedOnItsOwn).toBe(true);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("NTFY_TOKEN is an unresolved ${input:…} reference");
        expect(result.stderr).toContain(STDIN_TRAP_LOADED);
        expect(result.stderr).not.toContain(STDIN_TOUCHED);
        expect(result.stderr).not.toContain("running on stdio");
    });

    // #46: other placeholders the client didn't substitute fail the same way,
    // instead of being sent as a bearer token that 401s every call.
    it.each(["${env:NTFY_TOKEN}", "${NTFY_TOKEN}", "${input:}", "tk_abc${SUFFIX}"])(
        "exits at startup for NTFY_TOKEN=%j, writing nothing to stdout and leaving stdin unread",
        async (placeholder) => {
            workDir = mkdtempSync(join(tmpdir(), "ntfy-me-placeholder-"));

            const result = await runUntilExit(
                workDir,
                { NTFY_TOPIC: "placeholder", NTFY_URL: "http://127.0.0.1:9", NTFY_TOKEN: placeholder },
                INITIALIZE_REQUEST,
                STDIN_TRAP
            );

            expect(result.stdout).toBe("");
            expect(result.exitedOnItsOwn).toBe(true);
            expect(result.exitCode).toBe(1);
            expect(result.stderr).toContain("NTFY_TOKEN contains an unresolved ${…} placeholder");
            expect(result.stderr).not.toContain(placeholder);
            expect(result.stderr).toContain(STDIN_TRAP_LOADED);
            expect(result.stderr).not.toContain(STDIN_TOUCHED);
            expect(result.stderr).not.toContain("running on stdio");
        }
    );

    it("leaves a real NTFY_TOKEN alone (and the stdin trap sees the MCP transport read stdin)", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-real-token-"));

        const { stdout, stderr } = await startAndStop(
            workDir,
            { NTFY_TOPIC: "real_token", NTFY_URL: "http://127.0.0.1:9", NTFY_TOKEN: "tk_literaltoken" },
            STDIN_TRAP
        );

        expect(stdout).toBe("");
        expect(stderr).toContain("Using configured access token for http://127.0.0.1:9/real_token");
        expect(stderr).not.toContain("tk_literaltoken");
        // Control for the test above: the trap does detect a real reader.
        expect(stderr).toContain(STDIN_TRAP_LOADED);
        expect(stderr).toContain(STDIN_TOUCHED);
    });
});

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
        writeFileSync(join(workDir, ".env"), "NTFY_TOPIC=loaded_from_dotenv\n");

        const { stderr } = await startAndStop(workDir, { NTFY_URL: "http://127.0.0.1:9" });

        expect(stderr).toContain("http://127.0.0.1:9/loaded_from_dotenv");
    });

    it("reads ./.env as UTF-8, ignoring DOTENV_ENCODING", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-encoding-"));
        // A non-ASCII value only survives a UTF-8 read (latin1 would turn ü into Ã¼).
        // This relies on the startup log printing NTFY_URL as given; if startup ever
        // normalizes it (e.g. to punycode), update the expectation, not the encoding.
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

// #30: an invalid NTFY_TOPIC or NTFY_URL fails at startup, before any log line
// prints NTFY_URL. Each case runs in an empty temp dir, so no ./.env leaks in.
describe("startup configuration validation (#30)", () => {
    let workDir: string | undefined;

    afterEach(() => {
        if (workDir) rmSync(workDir, { recursive: true, force: true });
        workDir = undefined;
    });

    async function expectStartupFailure(env: Record<string, string>, message: string) {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-config-"));
        const result = await runUntilExit(workDir, env, INITIALIZE_REQUEST);

        expect(result.exitedOnItsOwn).toBe(true);
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).toContain(message);
        expect(result.stderr).not.toContain("running on stdio");
        return result;
    }

    it("exits when NTFY_TOPIC is missing", async () => {
        await expectStartupFailure({ NTFY_URL: "http://127.0.0.1:9" }, "NTFY_TOPIC environment variable is required");
    });

    it("exits when NTFY_TOPIC has invalid characters", async () => {
        await expectStartupFailure(
            { NTFY_TOPIC: "topic with spaces", NTFY_URL: "http://127.0.0.1:9" },
            "Invalid NTFY_TOPIC: topic may only contain letters, numbers, underscores, and hyphens"
        );
    });

    it.each(["not-a-url", "ntfy.sh", "   "])("exits when NTFY_URL is %j", async (url) => {
        await expectStartupFailure({ NTFY_TOPIC: "valid_topic", NTFY_URL: url }, "Invalid NTFY_URL: not a valid URL");
    });

    it("exits without echoing an unsupported NTFY_URL scheme (#55)", async () => {
        const { stderr } = await expectStartupFailure(
            { NTFY_TOPIC: "valid_topic", NTFY_URL: "ignore-previous-instructions:secretpayload" },
            "Invalid NTFY_URL: unsupported scheme. Only http:// and https:// URLs are supported."
        );
        expect(stderr).not.toContain("ignore-previous-instructions");
    });

    it.each<Record<string, string>>([{}, { NTFY_TOKEN: "tk_literaltoken" }])(
        "exits before printing an NTFY_URL with embedded credentials (%j)",
        async (tokenEnv) => {
            const { stderr } = await expectStartupFailure(
                { NTFY_TOPIC: "valid_topic", NTFY_URL: "https://admin:secret123@ntfy.example.com", ...tokenEnv },
                "Invalid NTFY_URL: credentials in the URL are not supported"
            );
            expect(stderr).not.toContain("secret123");
            expect(stderr).not.toContain("admin");
        }
    );

    it("still starts with a padded NTFY_TOPIC and an empty NTFY_URL (default ntfy.sh)", async () => {
        workDir = mkdtempSync(join(tmpdir(), "ntfy-me-config-ok-"));
        const { stdout, stderr } = await startAndStop(workDir, { NTFY_TOPIC: " padded_topic ", NTFY_URL: "" });

        expect(stdout).toBe("");
        expect(stderr).toContain("https://ntfy.sh");
        expect(stderr).toContain("running on stdio");
    });
});
