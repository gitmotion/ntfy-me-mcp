import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import { assertDockerAvailable, ntfyExec, startNtfy, stopNtfy } from "./docker.js";

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

export default async function setup(project: TestProject) {
    if (!existsSync(entry)) {
        throw new Error("build/index.js is missing. Run `npm run build` before `npm run test:e2e`.");
    }
    await assertDockerAvailable();

    const open = `ntfy-me-e2e-open-${process.pid}`;
    const auth = `ntfy-me-e2e-auth-${process.pid}`;

    try {
        const [ntfyUrl, authNtfyUrl] = await Promise.all([
            startNtfy(open),
            startNtfy(auth, {
                NTFY_AUTH_FILE: "/tmp/auth.db",
                NTFY_AUTH_DEFAULT_ACCESS: "deny-all",
            }),
        ]);

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
        await Promise.all([stopNtfy(open), stopNtfy(auth)]);
        throw error;
    }

    return async () => {
        await Promise.all([stopNtfy(open), stopNtfy(auth)]);
    };
}
