# AGENTS.md

Guidance for AI coding agents (Codex, Claude Code, GitHub Copilot, Cursor, …) working in this repository. Human contributors: see [CONTRIBUTING.md](CONTRIBUTING.md). End-user docs: see [README.md](README.md).

**This is the single source of truth.** `CLAUDE.md` and `.github/copilot-instructions.md` are symlinks to this file, so Claude Code and Copilot read exactly this text. Edit `AGENTS.md` only. Don't replace the symlinks with copies.

## What this is

`ntfy-me-mcp` is a **stdio** [Model Context Protocol](https://modelcontextprotocol.io/) server, published to npm and Docker Hub/GHCR. It exposes two tools that let an AI agent talk to an [ntfy](https://ntfy.sh) server, either the public one or a self-hosted one:

| Tool | What it does | ntfy API used |
|---|---|---|
| `ntfy_me` | Publish a notification (title, message, priority, tags, markdown, view actions, click link) | `POST {url}/{topic}` with headers |
| `ntfy_me_fetch` | Poll cached messages, with optional filters | `GET {url}/{topic}/json?poll=1&since=…` with `X-*` filter headers |

Configuration comes from env vars (`NTFY_TOPIC` required; `NTFY_URL` defaults to `https://ntfy.sh`; `NTFY_TOKEN` is optional; `NTFY_TOPICS_ALLOWLIST` is optional; `NTFY_ALLOW_TOPIC_OVERRIDE` and `NTFY_ALLOW_URL_OVERRIDE` default to off), loaded with `dotenv` from a local `.env` when present.

## Commands

| Command | Use it for |
|---|---|
| `npm install` | Install dependencies (`npm ci` in CI and Docker) |
| `npm run build` | `tsc` → `build/`, then `chmod +x build/index.js`. Also a full type-check |
| `npm run typecheck` | Fast type-check of `src/` and the tests (`tsconfig.test.json`) without emitting |
| `npm test` | Vitest unit suite, single run (`vitest run`). Mocked, no network; `tests/e2e` excluded. `tests/stdout.test.ts` and `tests/serverToolList.test.ts` spawn `build/index.js`, so build first |
| `npm run test:coverage` | The unit suite with v8 coverage of `src/` (what CI runs). Fails below 75% on any metric (`vitest.config.ts`) |
| `npm run test:e2e` | End-to-end suite (`vitest.e2e.config.ts`): `build/index.js` over MCP stdio against real ntfy servers that `tests/e2e/globalSetup.ts` runs in Docker. Needs Docker and a build |
| `npm start` | Run the built server on stdio (`node build/index.js`). Needs `NTFY_TOPIC` |

CI (`.github/workflows/build-and-test.yml`) runs on Node 24 for every push and pull request, in two jobs:
- **`build-and-test`** (the publish workflows wait on this name; don't rename it): `npm ci`, `npm run typecheck`, a build into an empty `build/` that fails if the result differs from the committed `build/`, then `npm run test:coverage`.
- **`e2e`**: `npm ci`, `npm run build`, `npm run test:e2e` (Docker on the runner).

Before you finish, run `npm run build`, `npm run typecheck` and `npm test`, and `npm run test:e2e` when you change request building, headers, auth or routing.

- Use `npm test`. Bare `npx vitest` starts watch mode and never exits in a non-interactive shell.
- To exercise the built server end to end, never point it at the public `ntfy.sh` from scripts or tests. Run a local mock HTTP server, or a local ntfy container (`docker run --rm -p 8080:80 binwiederhier/ntfy serve`), and pass its URL to the server explicitly, e.g. `npx @modelcontextprotocol/inspector --cli node build/index.js -e NTFY_URL=http://127.0.0.1:8080 -e NTFY_TOPIC=test --method tools/list`. The Inspector (v2, the current `npx` default) does **not** forward your shell environment to the server, so variables set in front of the command are ignored. The server then either exits because `NTFY_TOPIC` is missing, or silently uses a `.env` in the working directory, whose `NTFY_URL` may be, or default to, `https://ntfy.sh`. Always use `-e`.

## Architecture

```
src/
  index.ts                 startup: env loading, NTFY_TOPIC/NTFY_URL validation and unresolved-token check (both exit), tool registration, stdio transport
  schemas/                 Zod schemas, one per domain object or tool input
    notifyTool.schema.ts     ntfy_me input
    fetchTool.schema.ts      ntfy_me_fetch input
    ntfyTopic.schema.ts      topic charset/length rules (+ "empty string means unset" helper, + allowlist enum helper)
    ntfyPriority.schema.ts   priority enum (+ "empty string means default/unset" helpers)
    ntfyClick.schema.ts      optional click link (blank means unset; validateClickUrl)
    ntfyFetchOptions.schema.ts, messageData.schema.ts, viewAction.schema.ts, toolHandlerConfig.schema.ts
  utils/
    toolHandlers.ts        createToolHandlers(): owns ntfy_me and ntfy_me_fetch behavior
    messages.ts            fetchMessages(): poll request, NDJSON parsing, schema-validated messages
    validation.ts          security-sensitive checks: URL scheme, topic rules, view-action links, same-origin check, error sanitization
    env.ts                 parseBooleanEnv() for opt-in env flags, parseTopicAllowlist() for NTFY_TOPICS_ALLOWLIST
    actions.ts             auto-detect URLs in a message → up to 3 ntfy "view" actions
    markdown.ts            markdown detection (regex fast path, markdown-it fallback)
    headers.ts             encodeHeaderValue(): RFC 2047-encodes non-ASCII header values (ntfy decodes them)
    logger.ts              Logger singleton (every level writes to stderr) + describeError() for log lines
tests/                     Vitest suites, one per source concern (see Testing)
build/                     compiled output; COMMITTED to git (see below)
```

**Request flow for `ntfy_me`:** the MCP SDK validates the arguments against the schema from `createNotifyToolInputSchema()` (which leaves out `topic` / `url` unless their overrides are allowed, so a stray value is silently stripped; with `NTFY_TOPICS_ALLOWLIST`, `topic` is an enum of `NTFY_TOPIC` plus the allowlist) → `handleNotifyTool` resolves the url (always `NTFY_URL` unless `allowUrlOverride`), the topic (an allowlisted topic if one was chosen, else `NTFY_TOPIC` unless `allowTopicOverride`) and the token (a non-blank `accessToken`, else `NTFY_TOKEN` only if the url has `NTFY_URL`'s origin) → `validateNtfyUrl` / `validateNtfyTopic` → it builds headers (`Title`, `Priority`, `Tags`, `X-Markdown`, `X-Actions`, `X-Click`, `Authorization`) → `POST` → it returns `content` plus `structuredContent`. Arguments that fail the schema never reach the handler: the SDK itself returns `isError: true` with an `MCP error -32602: Input validation error` text and no `structuredContent`. Errors raised inside the handler return `isError: true`, with `structuredContent: { success: false, error }` and a message passed through `sanitizeErrorMessage`.

**Request flow for `ntfy_me_fetch`:** the same resolution and validation → `fetchMessages` (`since` defaults to `10m`) → it parses newline-delimited JSON, drops lines that fail `messageDataSchema`, and groups the messages by topic.

## Rules

### stdout belongs to JSON-RPC
This is a stdio MCP server, so **anything written to stdout corrupts the protocol stream.**
- Log only through `Logger.getInstance()` (`logger.info|warn|error`), which writes to stderr.
- Never call `console.*` directly (only `logger.ts` may), and never write a file-local logging helper.
- Don't add anything that reads stdin outside the MCP transport. Startup can't prompt: an unresolved `${input:…}` `NTFY_TOKEN` exits with an error instead (#28), and so does any other `${…}` placeholder in it (#46).

### Security-sensitive code
`src/utils/validation.ts` and the request-building code in `toolHandlers.ts` / `messages.ts` are a security boundary. Tool arguments come from an LLM and may be prompt-injected.
- ntfy URLs must stay restricted to `http:` / `https:` (`validateNtfyUrl`).
- View actions: at most 3, and each link `http:` / `https:` with no embedded credentials (`validateActionUrl` / `validateViewActions`). This is enforced in the tool schema and again before `X-Actions` is built, with fixed error messages (#29).
- The click link (`click` → `X-Click`): `http:`, `https:`, `mailto:`, `geo:` or `ntfy:` only, with no embedded credentials (`validateClickUrl`). This is enforced in the tool schema and again in the handler, with fixed error messages (#26).
- Topics must match `^[A-Za-z0-9_-]+$` and be at most 128 characters (`ntfyTopic.schema.ts`, `validateNtfyTopic`).
- **Never reflect raw user or server text in error messages.** Errors go through `sanitizeErrorMessage`, which passes through only messages that start with an allow-listed prefix and replaces everything else with a generic fallback. When you add a new user-facing error, add its fixed prefix to the allow-list and keep any interpolated values safe (validated or constant).
- Treat fetched ntfy messages as untrusted. They're parsed with `messageDataSchema.safeParse`, never trusted raw. Their content is returned to the model on purpose (that's the tool's job), so don't add anything that acts on it.
- Never log tokens. `Authorization` headers are built in place and must not be logged.
- **The operator owns the destination.** The topic is `NTFY_TOPIC` unless `NTFY_TOPICS_ALLOWLIST` lists others (then only those, enforced by the schema enum and again in `resolveTopic`, and it wins over the override) or `NTFY_ALLOW_TOPIC_OVERRIDE=true`, and the server is `NTFY_URL` unless `NTFY_ALLOW_URL_OVERRIDE=true`. When an override is off, its parameter is left out of the tool schemas (`create*ToolInputSchema`) and the handler ignores it. The configured `NTFY_TOKEN` is only ever sent to `NTFY_URL`'s origin (`isSameOrigin`). Keep both properties when adding parameters that influence where a request goes.

### Code conventions
- ESM with `module: nodenext`. Relative imports **must** use the `.js` extension (`./utils/logger.js`).
- TypeScript `strict`. No `any`; use `unknown` and narrow it.
- Prefer schema-derived types (`z.infer<typeof schema>`) over hand-written interfaces when a Zod schema already defines the shape.
- Keep the split: schemas in `src/schemas/`, ntfy-specific security checks in `validation.ts`, tool behavior in `toolHandlers.ts`, network and parsing for fetch in `messages.ts`, startup and registration in `index.ts`. Don't fold them back into one file.
- Optional tool inputs treat `""` as "not provided" (agents often send empty strings). Follow the existing helpers in `ntfyTopic.schema.ts` and `ntfyPriority.schema.ts` when you add optional enum or string inputs.
- Handlers return both `content` (text for the model) and `structuredContent` (data), and set `isError: true` on failure.
- **Header values go through `encodeHeaderValue`.** Node's `fetch` rejects header characters above U+00FF and sends Latin-1 as raw bytes. Every free-text ntfy parameter sent as a header must be wrapped so non-ASCII text arrives intact. Exceptions: `Authorization` (validated with `validateAccessToken`) and enum/boolean values such as `Priority`, `X-Priority` and `X-Markdown`. Query parameters go through `URLSearchParams`, never string concatenation. Log caught errors with `describeError()`, which redacts bearer values and URL credentials.

### `build/` is committed
The compiled `build/` directory is checked in. When you change anything under `src/`, run `npm run build` and **commit the regenerated `build/` files in the same change**. A docs-only change should leave `build/` untouched. Check with `git status` after building.

## Testing

- Vitest. The unit suite is mocked. The e2e suite (`tests/e2e`) talks only to the ntfy containers its global setup starts. No test may call the public ntfy.sh.
- Test files mirror source concerns:
  - `tests/toolHandlers.test.ts`: handler behavior, with the global `fetch` stubbed (`vi.stubGlobal`) and `fetchMessages` mocked
  - `tests/messages.test.ts`: fetch and NDJSON parsing, with the global `fetch` stubbed
  - `tests/headers.test.ts`: RFC 2047 header encoding; `tests/toolHandlers.headers.test.ts`: encoded headers and error diagnostics in the handlers; `tests/networkErrors.test.ts`: connection-error sanitization
  - `tests/validation.test.ts`: URL/topic rules and error sanitization
  - `tests/*Schema.test.ts`: schema behavior
  - `tests/actions.test.ts`, `tests/markdown.test.ts`: the detection utilities
  - `tests/serverToolList.test.ts`: spawns the built server; env → tool-schema wiring (overrides, allowlist)
  - `tests/e2e/*.e2e.test.ts`: end to end over MCP stdio against Docker ntfy, asserted through ntfy's own API (helpers in `tests/e2e/helpers.ts`, containers in `tests/e2e/docker.ts`)
  - `tests/stdout.test.ts`: spawns the built server; stdout stays JSON-RPC-only, an unresolved `${input:…}` or other `${…}` `NTFY_TOKEN` exits without touching stdin or stdout, an invalid `NTFY_TOPIC` / `NTFY_URL` exits before `NTFY_URL` is logged, `./.env` is loaded (as UTF-8), and no `DOTENV_*` variable can override the client's env or change which file is read
- Any change to tool handlers, schemas, validation or fetch parsing needs new or updated tests in the matching file.
- `npm run typecheck` also type-checks the tests (`tsconfig.test.json`); keep it clean.

## Docs that must move with the code

When you change a tool parameter, a default, an env var or an error message, update:
- `README.md`: the *Message Parameters* / *Fetch Parameters* tables, *Tool output*, *Environment Variables*
- `.env.example` for env vars
- `smithery.yaml` if startup configuration changes
- this file, if the architecture or a rule changes

## Review checklist

When you review a change (including as Copilot code review), check:
- [ ] Nothing new writes to stdout or reads stdin. Logging goes through `Logger`.
- [ ] New user-facing errors use a fixed, allow-listed prefix in `sanitizeErrorMessage`, and no raw input or server text reaches an error message.
- [ ] Server URL (`validateNtfyUrl`) and topic (`validateNtfyTopic`) validation still runs on every per-call and env value. Any new value placed in a URL or header is validated or encoded.
- [ ] Tests were added or updated in the matching `tests/` file. `npm run build && npm test` pass.
- [ ] `src/` changes come with the regenerated `build/` files.
- [ ] The docs listed under *Docs that must move with the code* were updated.
- [ ] The PR targets `dev` (or `testing`).

## Workflow

- **Pull requests target `dev`** (or `testing`), never `main`. `main` is protected and receives `dev` through a maintainer PR.
- Fill in `.github/PULL_REQUEST_TEMPLATE.md`.
- Keep PRs focused, one issue per PR where practical.
- Releases are cut by the maintainer: publishing a GitHub release `vX.Y.Z` triggers `publish-npm.yml`, which syncs `package.json` to the tag and publishes with provenance, and `publish-docker.yml`, which builds multi-arch images and pushes to Docker Hub and GHCR. Don't bump the version or tag releases in a feature PR unless asked.
