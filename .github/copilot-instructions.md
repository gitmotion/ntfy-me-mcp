# Project Guidelines

## Build and Test
- Install dependencies with `npm install`.
- Build with `npm run build` before relying on local runtime behavior. The build script also marks `build/index.js` executable.
- Run tests with `npm test`.
- If you change tool behavior, validation, schemas, or parsing logic, run both `npm test` and `npm run build` before finishing.
- For local runtime validation, use `npm start` or `node build/index.js` after building.

## Architecture
- Keep `src/index.ts` focused on MCP server startup, environment loading, unresolved token prompting, and tool registration.
- Keep tool behavior in `src/utils/toolHandlers.ts`. This module owns the `ntfy_me` and `ntfy_me_fetch` handler logic.
- Keep ntfy fetch/network parsing in `src/utils/messages.ts`.
- Keep schema definitions in `src/schemas/`, with one schema file per domain object or tool input when practical.
- Keep narrow utility logic in `src/utils/`:
  - `validation.ts` for security-sensitive input validation and error sanitization
  - `actions.ts` for URL-to-view-action extraction
  - `markdown.ts` for markdown detection
  - `logger.ts` for the singleton logger abstraction

## Conventions
- Prefer schema-derived types (`z.infer`) over duplicate interface declarations when a Zod schema already defines the shape.
- Use the `Logger` singleton from `src/utils/logger.ts` for logging. Do not add direct `console.log`, `console.warn`, or `console.error` calls, and do not create file-local logging helpers instead of using the shared logger.
- Follow the current TypeScript strictness. Avoid `any`; use explicit types or `unknown` with narrowing.
- Preserve the current split between schema validation and security validation:
  - Zod schemas define tool inputs and message/config shapes.
  - `src/utils/validation.ts` enforces ntfy-specific URL/topic rules and sanitizes error messages.
- Keep changes focused. Do not move startup logic, network logic, and schema logic back into one file.

## Security and Validation
- Treat URL, topic, token, and server response handling as security-sensitive.
- ntfy URLs must remain restricted to HTTP/HTTPS.
- ntfy topics must remain limited to letters, numbers, underscores, and hyphens, with the current length cap.
- Preserve sanitized error behavior. Do not reflect arbitrary server or user-controlled text back to tool output.
- When parsing fetched ntfy messages, prefer schema-validated payload handling over trusting raw JSON.

## Tests
- Add or update Vitest coverage for any change to tool handlers, fetch parsing, schemas, or validation.
- Mirror source concerns in tests:
  - `tests/toolHandlers.test.ts` for mocked tool handler behavior
  - `tests/messages.test.ts` for mocked fetch/parsing behavior
  - `tests/*Schema.test.ts` for schema behavior
  - `tests/validation.test.ts` for security and sanitization rules
- Prefer mocks over live ntfy calls in automated tests.

## Docs
- See `README.md` for installation modes, MCP configuration examples, tool usage, and end-user behavior.
- See `CONTRIBUTING.md` for development workflow, logging rules, and validation checklist.
- If asked to prepare PR-ready changes, target `dev` or `testing` unless the user explicitly says otherwise.
