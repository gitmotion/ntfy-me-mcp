# Contributing

## Workflow

- Point pull requests to the `dev` or `testing` branches, not `main`.
- Clearly describe your changes in the pull request description.
- Keep changes focused and make sure they pass local validation before you open the PR.

## Development Setup

Requires Node.js 22 or newer. CI and the Docker image use Node 24.

```bash
git clone https://github.com/gitmotion/ntfy-me-mcp.git
cd ntfy-me-mcp
npm install
npm run build
```

AI coding agents: the repository's agent guide is [AGENTS.md](AGENTS.md). `CLAUDE.md` (Claude Code) and `.github/copilot-instructions.md` (GitHub Copilot) are **symlinks** to it, so update `AGENTS.md` only. On Windows, enable symlinks **before cloning** (Developer Mode, plus `git clone -c core.symlinks=true …` or `git config --global core.symlinks true`), or those two files will check out as plain text containing the link path.

## The `build/` directory is committed

The compiled `build/` output is checked into git. When you change anything under `src/`:

1. Run `npm run build`.
2. Commit the regenerated `build/` files in the same PR as the `src/` change.

A docs-only change should leave `build/` untouched. `git status` after `npm run build` should show no `build/` changes.

## Logging

- Use the `Logger` class abstraction for logging.
- Replace `console.log`, `console.warn`, and `console.error` with `logger.info`, `logger.warn`, and `logger.error`.

## Testing Expectations

- Add tests for new functionality.
- Update existing tests when changing functionality, validation rules, schemas, or parsing behavior.
- The unit suite (`npm test`) mocks the network. Behaviour that only a real server shows (header encoding, auth, routing) belongs in the end-to-end suite (`npm run test:e2e`), which runs ntfy in Docker. Never call the public ntfy.sh from tests.
- Put tests in the file that mirrors the source concern:

| Test file | Covers |
| --- | --- |
| `tests/toolHandlers.test.ts` | `ntfy_me` / `ntfy_me_fetch` handler behavior (network mocked) |
| `tests/messages.test.ts` | fetch request building and NDJSON parsing (network mocked) |
| `tests/validation.test.ts` | URL/topic validation and error sanitization |
| `tests/*Schema.test.ts` | Zod schema behavior |
| `tests/actions.test.ts`, `tests/markdown.test.ts` | URL → view-action and markdown detection |
| `tests/stdout.test.ts` | Spawns `build/index.js` (run `npm run build` first): stdout hygiene, the unresolved `${input:…}` token exit, `./.env` loading, and dotenv option pinning |
| `tests/serverToolList.test.ts` | Spawns `build/index.js`: env → tool-schema wiring (topic/url overrides, `NTFY_TOPICS_ALLOWLIST`) |
| `tests/e2e/*.e2e.test.ts` | **End to end** (`npm run test:e2e`, needs Docker and a build): the built server over MCP stdio against real ntfy servers, checked through ntfy's own API. Publishing, non-ASCII, markdown/actions, fetch filters, auth, destination control |

## Local Validation

- Type-check quickly with `npm run typecheck` while you work. It checks `src/` and the tests (`tsconfig.test.json`).
- Build the project with `npm run build`, which also type-checks.
- Run the test suite before submitting changes with `npm test`.
- If you touched request building, headers, auth or routing, also run `npm run build && npm run test:e2e`. It starts two ntfy containers (`binwiederhier/ntfy:v2.28.0`, pinned by digest in `tests/e2e/docker.ts`, or `NTFY_E2E_IMAGE`) on free loopback ports and removes them afterwards. On Ctrl-C or SIGTERM a detached cleanup process removes them, then checks once more 15 s later in case one was still starting. If any are left (for example after SIGKILL), remove them with `docker ps -aq --filter label=ntfy-me-e2e | xargs -r docker rm -f` (works in bash and zsh, and does nothing when there's nothing to remove).
- Run the server locally with `npm start` or `node build/index.js` (requires `NTFY_TOPIC`, e.g. from a `.env` file).
- Ensure the code is clean, well documented, and consistent with the existing project style.

CI (`.github/workflows/build-and-test.yml`) runs on every push and pull request:
- **`build-and-test`** type-checks `src/` and the tests (`npm run typecheck`), rebuilds `build/` from scratch and fails if it differs from the committed one (so commit `build/` with every `src/` change), and runs the unit suite with coverage (`npm run test:coverage`, at least 75% of `src/` on each metric). The job summary shows the coverage numbers.
- **`e2e`** builds and runs the end-to-end suite against ntfy in Docker (`npm run test:e2e`).

## Releases

Releases are cut by the maintainer. Publishing a GitHub release tagged `vX.Y.Z` triggers:

- `publish-npm.yml`: waits for `build-and-test`, syncs `package.json` to the tag version, builds, and runs `npm publish --provenance`.
- `publish-docker.yml`: waits for `build-and-test`, then builds `linux/amd64` + `linux/arm64` images and pushes `X.Y.Z` and `latest` to Docker Hub and GHCR. On ordinary pushes and PRs it only builds, as a check.

Contributors don't need to bump the version in their PRs.

## NPM Scripts And Commands

<table>
  <thead>
    <tr>
      <th width="20%">Script / Command</th>
      <th width="30%">Underlying action</th>
      <th width="50%">What it does</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>npm install</code></td>
      <td>Installs dependencies from <code>package.json</code></td>
      <td>Sets up the project locally for development or testing.</td>
    </tr>
    <tr>
      <td><code>npm run build</code></td>
      <td><code>tsc && chmod +x build/index.js</code></td>
      <td>Compiles the TypeScript source into <code>build/</code> and marks the built entrypoint as executable. Runs a full type-check as part of the build.</td>
    </tr>
    <tr>
      <td><code>npm run typecheck</code></td>
      <td><code>tsc --noEmit &amp;&amp; tsc -p tsconfig.test.json</code></td>
      <td>Type-checks <code>src/</code> and the tests without emitting output. Use this for fast manual type-checking without triggering a full build.</td>
    </tr>
    <tr>
      <td><code>npm start</code></td>
      <td><code>node build/index.js</code></td>
      <td>Starts the built MCP server from the compiled output.</td>
    </tr>
    <tr>
      <td><code>npm test</code></td>
      <td><code>vitest run</code></td>
      <td>Runs the unit suite once in non-watch mode (network mocked; <code>tests/e2e</code> excluded).</td>
    </tr>
    <tr>
      <td><code>npm run test:coverage</code></td>
      <td><code>vitest run --coverage</code></td>
      <td>Runs the unit suite with coverage of <code>src/</code>, as CI does. Fails below 75% on any metric.</td>
    </tr>
    <tr>
      <td><code>npm run test:e2e</code></td>
      <td><code>vitest run --config vitest.e2e.config.ts</code></td>
      <td>Runs the end-to-end suite against real ntfy servers in Docker. Needs Docker and <code>npm run build</code> first.</td>
    </tr>
  </tbody>
</table>

Thank you for helping improve ntfy-me-mcp 🙏🏻