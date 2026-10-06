# CLAUDE.md

@AGENTS.md

## Claude Code notes

`AGENTS.md` (imported above) is the source of truth for commands, architecture and rules. Edit that file, not this one, so every agent sees the change. Only Claude-specific notes belong here.

- Use `npm test` (single run). Bare `npx vitest` starts watch mode and never exits.
- To try the server end to end without a real ntfy server, don't call `ntfy.sh` from tests or scripts. Point `NTFY_URL` at a local mock HTTP server, or use the MCP Inspector against a throwaway topic: `NTFY_TOPIC=<throwaway> npx @modelcontextprotocol/inspector node build/index.js`.
- Before you finish a change under `src/`: `npm run build && npm test`, then `git status`. Expect the regenerated `build/` files to show up, and commit them.
