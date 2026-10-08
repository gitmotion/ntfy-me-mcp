import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { assertDockerAvailable, ensureImage, ntfyExec, startNtfy, stopNtfy } from "./docker.js";

declare module "vitest" {
    export interface ProvidedContext {
        /** An open ntfy server (anonymous read/write). */
        ntfyUrl: string;
        /** An ntfy server with `deny-all` default access. */
        authNtfyUrl: string;
        /** A token for an admin user on authNtfyUrl. */
        authToken: string;
    }
}

const entry = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "build", "index.js");

// Removes the named containers now and again after 15 s (a `docker run` that
// was mid-create when the signal arrived has finished by then).
const REAPER = `
const { execFileSync } = require("node:child_process");
const names = JSON.parse(process.argv[1]);
const remove = () => { try { execFileSync("docker", ["rm", "-f", ...names], { stdio: "ignore" }); } catch {} };
remove();
setTimeout(remove, 15000);
`;

export default async function setup(project: TestProject) {
    if (!existsSync(entry)) {
        throw new Error("build/index.js is missing. Run `npm run build` before `npm run test:e2e`.");
    }
    await assertDockerAvailable();
    // Pull before any container starts, so a `docker run` never includes a slow
    // pull that could outlast the signal-time cleanup's second sweep.
    await ensureImage();

    // Random names: pids repeat across CI containers sharing one Docker daemon.
    const run = randomBytes(4).toString("hex");
    const open = `ntfy-me-e2e-open-${run}`;
    const auth = `ntfy-me-e2e-auth-${run}`;

    // Ctrl-C / SIGTERM skip vitest's teardown. The signal can arrive while a
    // `docker run` is still creating a container, and a second Ctrl-C kills
    // this process group (including any cleanup child), so hand the cleanup to
    // a detached Node process that outlives the run and sweeps again later.
    const reapContainers = () => {
        spawn(process.execPath, ["-e", REAPER, JSON.stringify([open, auth])], {
            detached: true,
            stdio: "ignore",
            windowsHide: true,
        })
            .on("error", () => undefined)
            .unref();
    };
    process.on("SIGINT", reapContainers);
    process.on("SIGTERM", reapContainers);
    // Keep the handlers until the containers are gone: a Ctrl-C during
    // teardown can kill `docker rm` before it reaches the daemon.
    const stopAll = async () => {
        await Promise.all([stopNtfy(open), stopNtfy(auth)]);
        process.off("SIGINT", reapContainers);
        process.off("SIGTERM", reapContainers);
    };

    try {
        // allSettled, so a failed start can't leave the other one starting after cleanup.
        const started = await Promise.allSettled([
            startNtfy(open),
            startNtfy(auth, {
                NTFY_AUTH_FILE: "/tmp/auth.db",
                NTFY_AUTH_DEFAULT_ACCESS: "deny-all",
            }),
        ]);
        const failed = started.find((result) => result.status === "rejected");
        if (failed) {
            throw failed.reason;
        }
        const [ntfyUrl, authNtfyUrl] = started.map((result) => (result as PromiseFulfilledResult<string>).value);

        await ntfyExec(auth, { NTFY_PASSWORD: "e2e-password" }, "user", "add", "--role=admin", "e2eadmin");
        const tokenOutput = await ntfyExec(auth, {}, "token", "add", "e2eadmin");
        const authToken = tokenOutput.match(/tk_[A-Za-z0-9]+/)?.[0];
        if (!authToken) {
            throw new Error("Couldn't create an ntfy access token for the e2e auth server.");
        }

        project.provide("ntfyUrl", ntfyUrl);
        project.provide("authNtfyUrl", authNtfyUrl);
        project.provide("authToken", authToken);
    } catch (error) {
        await stopAll();
        throw error;
    }

    return stopAll;
}
