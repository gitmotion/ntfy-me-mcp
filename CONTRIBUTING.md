# Contributing

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
- Run the test suite before submitting changes with `npm test`
- Ensure the code is clean, well documented, and consistent with the existing project style.

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