# Contributing

Contributions are welcome!

## Workflow

- Point pull requests to the `dev` or `testing` branches, not `main`.
- Clearly describe your changes in the pull request description.
- Keep changes focused and make sure they pass local validation before you open the PR.

## Development Setup

```bash
git clone https://github.com/gitmotion/ntfy-me-mcp.git
cd ntfy-me-mcp
npm install
npm run build
```

## Logging

- Use the `Logger` class abstraction for logging.
- Replace `console.log`, `console.warn`, and `console.error` with `logger.info`, `logger.warn`, and `logger.error`.

## Testing Expectations

- Add tests for new functionality.
- Update existing tests when changing functionality, validation rules, schemas, or parsing behavior.
- Prefer mocked tests over live ntfy calls in the automated suite.

## Local Validation

- Build the project with `npm run build`.
- Run the server locally with `npm start` or `node build/index.js`.
- Run the test suite before submitting changes.
- Ensure the code is clean, well documented, and consistent with the existing project style.

## NPM Scripts And Commands

| Script / Command | Underlying action | What it does |
| ---------------- | ----------------- | ------------ |
| `npm install` | Installs dependencies from `package.json` | Sets up the project locally for development or testing. |
| `npm run build` | `tsc && chmod +x build/index.js` | Compiles the TypeScript source into `build/` and marks the built entrypoint as executable. |
| `npm start` | `node build/index.js` | Starts the built MCP server from the compiled output. |
| `npm test` | `vitest run` | Runs the automated test suite once in non-watch mode. |

Thank you for helping improve ntfy-me-mcp 🙏🏻