# Project Guidelines

The full agent guide for this repository is [`AGENTS.md`](../AGENTS.md) at the repo root: commands, architecture, conventions, security rules, testing and workflow. Read it first, and keep it, rather than this file, up to date.

The rules most often broken, repeated here because Copilot does not import other files:

- **Never write to stdout.** This is a stdio MCP server. Log only through the `Logger` singleton (`src/utils/logger.ts`), which writes to stderr. No direct `console.*` calls outside `logger.ts`.
- **Treat tool inputs as untrusted.** Keep ntfy URLs restricted to http/https and topics to `[A-Za-z0-9_-]` (max 128). Route every user-facing error through `sanitizeErrorMessage` in `src/utils/validation.ts`, and never reflect raw input.
- **`build/` is committed.** After changing `src/`, run `npm run build` and `npm test`, then commit the regenerated `build/` files.
- **Tests are mocked.** Add or update Vitest coverage in the matching `tests/` file for any change to handlers, schemas, validation or fetch parsing. No live ntfy calls.
- **PRs target `dev` or `testing`**, not `main`.
