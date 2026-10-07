import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Pinned for reproducible runs; override with NTFY_E2E_IMAGE to test another ntfy.
export const NTFY_IMAGE = process.env.NTFY_E2E_IMAGE || "binwiederhier/ntfy:v2.28.0";

// Every request in a run comes from one visitor (the Docker gateway), so lift
// ntfy's per-visitor limits for the test containers. Each test uses fresh
// topics, so the new-topic limit (100, then 1/min) matters too; 0 disables it.
const NO_RATE_LIMITS = {
    NTFY_VISITOR_REQUEST_LIMIT_BURST: "100000",
    NTFY_VISITOR_MESSAGE_DAILY_LIMIT: "100000",
    NTFY_VISITOR_TOPIC_CREATION_LIMIT_BURST: "0",
};

/** Every e2e container carries this label, so leftovers are easy to find and remove. */
export const E2E_LABEL = "ntfy-me-e2e";

async function docker(...args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("docker", args);
    return stdout.trim();
}

export async function assertDockerAvailable(): Promise<void> {
    try {
        await docker("version", "--format", "{{.Server.Version}}");
    } catch {
        throw new Error(
            "The e2e suite runs ntfy in Docker, and Docker isn't available. Start Docker (or run `npm test` for the unit suite)."
        );
    }
}

/** Pulls NTFY_IMAGE unless it's already present. */
export async function ensureImage(): Promise<void> {
    try {
        await docker("image", "inspect", NTFY_IMAGE);
    } catch {
        await docker("pull", NTFY_IMAGE);
    }
}

/** Starts `ntfy serve` on a free loopback port and waits until it's healthy. */
export async function startNtfy(name: string, env: Record<string, string> = {}): Promise<string> {
    const envArgs = Object.entries({ ...NO_RATE_LIMITS, ...env }).flatMap(([key, value]) => ["-e", `${key}=${value}`]);
    await docker(
        "run", "-d", "--rm", "--name", name, "--label", E2E_LABEL,
        "-p", "127.0.0.1::80", ...envArgs, NTFY_IMAGE, "serve"
    );

    const mapping = await docker("port", name, "80/tcp");
    const port = mapping.split("\n")[0].split(":").pop();
    const url = `http://127.0.0.1:${port}`;

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${url}/v1/health`);
            if (response.ok) return url;
        } catch {
            // not listening yet
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`ntfy container ${name} did not become healthy at ${url}`);
}

export async function stopNtfy(name: string): Promise<void> {
    await docker("rm", "-f", name).catch(() => undefined);
}

/** Runs `ntfy <args>` inside a running container (for user and token setup). */
export async function ntfyExec(name: string, env: Record<string, string>, ...args: string[]): Promise<string> {
    const envArgs = Object.entries(env).flatMap(([key, value]) => ["-e", `${key}=${value}`]);
    const { stdout, stderr } = await execFileAsync("docker", ["exec", ...envArgs, name, "ntfy", ...args]);
    return `${stdout}${stderr}`.trim();
}
