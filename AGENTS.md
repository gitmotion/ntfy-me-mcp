# AGENTS.md

Guidance for AI coding agents (Codex, Claude Code, Copilot, Cursor, …) working in this repository. Human contributors: see [CONTRIBUTING.md](CONTRIBUTING.md). End-user docs: see [README.md](README.md).

## What this is

`ntfy-me-mcp` is a **stdio** [Model Context Protocol](https://modelcontextprotocol.io/) server, published to npm and Docker Hub/GHCR. It exposes two tools that let an AI agent talk to an [ntfy](https://ntfy.sh) server, either the public one or a self-hosted one:

| Tool | What it does | ntfy API used |
|---|---|---|
| `ntfy_me` | Publish a notification (title, message, priority, tags, markdown, view actions) | `POST {url}/{topic}` with headers |
| `ntfy_me_fetch` | Poll cached messages, with optional filters | `GET {url}/{topic}/json?poll=1&since=…` with `X-*` filter headers |

Configuration comes from env vars (`NTFY_TOPIC` required; `NTFY_URL` defaults to `https://ntfy.sh`; `NTFY_TOKEN` is optional), loaded with `dotenv` from a local `.env` when present.

## Commands

| Command | Use it for |
|---|---|
| `npm install` | Install dependencies (`npm ci` in CI and Docker) |
| `npm run build` | `tsc` → `build/`, then `chmod +x build/index.js`. Also a full type-check |
| `npm run typecheck` | Fast type-check of `src/` without emitting |
| `npm test` | Vitest, single run (`vitest run`). Mocked, no network |
| `npm start` | Run the built server on stdio (`node build/index.js`). Needs `NTFY_TOPIC` |

CI (`.github/workflows/build-and-test.yml`) runs `npm ci && npm run build && npm test` on Node 24 for every push and pull request. Run the same three before you finish.

- Use `npm test`. Bare `npx vitest` starts watch mode and never exits in a non-interactive shell.
- To exercise the built server end to end, never point it at the public `ntfy.sh` from scripts or tests. Run a local mock HTTP server (or a local ntfy container, `docker run -p 8080:80 binwiederhier/ntfy serve`) and set `NTFY_URL` to it, e.g. `NTFY_URL=http://127.0.0.1:8080 NTFY_TOPIC=test npx @modelcontextprotocol/inspector node build/index.js`.

## Architecture

```
src/
  index.ts                 startup: env loading, unresolved-token prompt, tool registration, stdio transport
  schemas/                 Zod schemas, one per domain object or tool input
    notifyTool.schema.ts     ntfy_me input
    fetchTool.schema.ts      ntfy_me_fetch input
    ntfyTopic.schema.ts      topic charset/length rules (+ "empty string means unset" helper)
    ntfyPriority.schema.ts   priority enum (+ "empty string means default/unset" helpers)
    ntfyFetchOptions.schema.ts, messageData.schema.ts, viewAction.schema.ts, toolHandlerConfig.schema.ts
  utils/
    toolHandlers.ts        createToolHandlers(): owns ntfy_me and ntfy_me_fetch behavior
    messages.ts            fetchMessages(): poll request, NDJSON parsing, schema-validated messages
    validation.ts          security-sensitive checks: URL scheme, topic rules, error sanitization
    actions.ts             auto-detect URLs in a message → up to 3 ntfy "view" actions
    markdown.ts            markdown detection (regex fast path, markdown-it fallback)
    logger.ts              Logger singleton; every level writes to stderr
tests/                     Vitest suites, one per source concern (see Testing)
build/                     compiled output; COMMITTED to git (see below)
```

**Request flow for `ntfy_me`:** the MCP SDK validates the arguments against `notifyToolInputSchema` → `handleNotifyTool` resolves url, topic and token (tool argument, then env default) → `validateNtfyUrl` / `validateNtfyTopic` → it builds headers (`Title`, `Priority`, `Tags`, `X-Markdown`, `X-Actions`, `Authorization`) → `POST` → it returns `content` plus `structuredContent`. Arguments that fail the schema never reach the handler: the SDK itself returns `isError: true` with an `MCP error -32602: Input validation error` text and no `structuredContent`. Errors raised inside the handler return `isError: true`, with `structuredContent: { success: false, error }` and a message passed through `sanitizeErrorMessage`.

**Request flow for `ntfy_me_fetch`:** the same resolution and validation → `fetchMessages` (`since` defaults to `10m`) → it parses newline-delimited JSON, drops lines that fail `messageDataSchema`, and groups the messages by topic.

## Rules

### stdout belongs to JSON-RPC
This is a stdio MCP server, so **anything written to stdout corrupts the protocol stream.**
- Log only through `Logger.getInstance()` (`logger.info|warn|error`), which writes to stderr.
- Never call `console.*` directly (only `logger.ts` may), and never write a file-local logging helper.
- Don't add anything that reads stdin outside the MCP transport (see #28 for an existing violation).

### Security-sensitive code
`src/utils/validation.ts` and the request-building code in `toolHandlers.ts` / `messages.ts` are a security boundary. Tool arguments come from an LLM and may be prompt-injected.
- ntfy URLs must stay restricted to `http:` / `https:` (`validateNtfyUrl`).
- Topics must match `^[A-Za-z0-9_-]+$` and be at most 128 characters (`ntfyTopic.schema.ts`, `validateNtfyTopic`).
- **Never reflect raw user or server text in tool output.** Errors go through `sanitizeErrorMessage`, which passes through only messages that start with an allow-listed prefix and replaces everything else with a generic fallback. When you add a new user-facing error, add its fixed prefix to the allow-list and keep any interpolated values safe (validated or constant).
- Treat fetched ntfy messages as untrusted. They're parsed with `messageDataSchema.safeParse`, never trusted raw.
- Never log tokens. `Authorization` headers are built in place and must not be logged.

### Code conventions
- ESM with `module: nodenext`. Relative imports **must** use the `.js` extension (`./utils/logger.js`).
- TypeScript `strict`. No `any`; use `unknown` and narrow it.
- Prefer schema-derived types (`z.infer<typeof schema>`) over hand-written interfaces when a Zod schema already defines the shape.
- Keep the split: schemas in `src/schemas/`, ntfy-specific security checks in `validation.ts`, tool behavior in `toolHandlers.ts`, network and parsing for fetch in `messages.ts`, startup and registration in `index.ts`. Don't fold them back into one file.
- Optional tool inputs treat `""` as "not provided" (agents often send empty strings). Follow the existing helpers in `ntfyTopic.schema.ts` and `ntfyPriority.schema.ts` when you add optional enum or string inputs.
- Handlers return both `content` (text for the model) and `structuredContent` (data), and set `isError: true` on failure.

### `build/` is committed
The compiled `build/` directory is checked in. When you change anything under `src/`, run `npm run build` and **commit the regenerated `build/` files in the same change**. A docs-only change should leave `build/` untouched. Check with `git status` after building.

## Testing

- Vitest. All tests are mocked; no test may call a live ntfy server.
- Test files mirror source concerns:
  - `tests/toolHandlers.test.ts`: handler behavior, with `node-fetch` and `fetchMessages` mocked
  - `tests/messages.test.ts`: fetch and NDJSON parsing, with `node-fetch` mocked
  - `tests/validation.test.ts`: URL/topic rules and error sanitization
  - `tests/*Schema.test.ts`: schema behavior
  - `tests/actions.test.ts`, `tests/markdown.test.ts`: the detection utilities
- Any change to tool handlers, schemas, validation or fetch parsing needs new or updated tests in the matching file.
- Tests are not type-checked by `npm run typecheck` (`tsconfig.json` includes only `src/`), so keep them type-correct by hand.

## Docs that must move with the code

When you change a tool parameter, a default, an env var or an error message, update:
- `README.md`: the *Message Parameters* / *Fetch Parameters* tables, *Tool output*, *Environment Variables*
- `.env.example` for env vars
- `smithery.yaml` if startup configuration changes
- this file, if the architecture or a rule changes

## Workflow

- **Pull requests target `dev`** (or `testing`), never `main`. `main` is protected and receives `dev` through a maintainer PR.
- Fill in `.github/PULL_REQUEST_TEMPLATE.md`.
- Keep PRs focused, one issue per PR where practical.
- Releases are cut by the maintainer: publishing a GitHub release `vX.Y.Z` triggers `publish-npm.yml`, which syncs `package.json` to the tag and publishes with provenance, and `publish-docker.yml`, which builds multi-arch images and pushes to Docker Hub and GHCR. Don't bump the version or tag releases in a feature PR unless asked.
