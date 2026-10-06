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
- Prefer mocked tests over live ntfy calls in the automated suite.
- Put tests in the file that mirrors the source concern:

| Test file | Covers |
| --- | --- |
| `tests/toolHandlers.test.ts` | `ntfy_me` / `ntfy_me_fetch` handler behavior (network mocked) |
| `tests/messages.test.ts` | fetch request building and NDJSON parsing (network mocked) |
| `tests/validation.test.ts` | URL/topic validation and error sanitization |
| `tests/*Schema.test.ts` | Zod schema behavior |
| `tests/actions.test.ts`, `tests/markdown.test.ts` | URL → view-action and markdown detection |
| `tests/stdout.test.ts` | Spawns `build/index.js` (run `npm run build` first): stdout hygiene and dotenv precedence |

## Local Validation

- Type-check quickly with `npm run typecheck` while you work.
- Build the project with `npm run build`, which also type-checks.
- Run the test suite before submitting changes with `npm test`.
- Run the server locally with `npm start` or `node build/index.js` (requires `NTFY_TOPIC`, e.g. from a `.env` file).
- Ensure the code is clean, well documented, and consistent with the existing project style.

CI (`.github/workflows/build-and-test.yml`) runs `npm ci`, `npm run build` and `npm test` on every push and pull request.

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
      <td><code>tsc --noEmit</code></td>
      <td>Runs TypeScript type-checking without emitting output. Use this for fast manual type-checking without triggering a full build.</td>
    </tr>
    <tr>
      <td><code>npm start</code></td>
      <td><code>node build/index.js</code></td>
      <td>Starts the built MCP server from the compiled output.</td>
    </tr>
    <tr>
      <td><code>npm test</code></td>
      <td><code>vitest run</code></td>
      <td>Runs the automated test suite once in non-watch mode.</td>
    </tr>
  </tbody>
</table>

Thank you for helping improve ntfy-me-mcp 🙏🏻