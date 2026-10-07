import { configDefaults, defineConfig } from "vitest/config";

// Unit suite (`npm test`): mocked network, no Docker. The end-to-end suite in
// tests/e2e needs Docker and runs separately (`npm run test:e2e`).
export default defineConfig({
    test: {
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
    },
});
