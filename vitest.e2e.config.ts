import { defineConfig } from "vitest/config";

// End-to-end suite (`npm run test:e2e`): drives build/index.js over MCP stdio
// against real ntfy servers that tests/e2e/globalSetup.ts runs in Docker.
export default defineConfig({
    test: {
        include: ["tests/e2e/**/*.e2e.test.ts"],
        globalSetup: ["tests/e2e/globalSetup.ts"],
        testTimeout: 30_000,
        hookTimeout: 90_000,
    },
});
