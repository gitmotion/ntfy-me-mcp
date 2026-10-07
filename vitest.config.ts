import { configDefaults, defineConfig } from "vitest/config";

// Unit suite (`npm test`): mocked network, no Docker. The end-to-end suite in
// tests/e2e needs Docker and runs separately (`npm run test:e2e`).
export default defineConfig({
    test: {
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
        // `npm run test:coverage` (CI). src/index.ts runs only in the servers
        // that tests spawn, so it reports 0% here; the floor leaves room for that.
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            reporter: ["text", "json-summary"],
            thresholds: { statements: 75, branches: 75, functions: 75, lines: 75 },
        },
    },
});
