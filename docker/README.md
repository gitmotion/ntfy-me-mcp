# ntfy-me-mcp

[![Docker Image Version](https://img.shields.io/docker/v/gitmotion/ntfy-me-mcp?logo=docker&label=Docker)](https://hub.docker.com/r/gitmotion/ntfy-me-mcp)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](https://github.com/gitmotion/ntfy-me-mcp/blob/main/LICENSE)
[![GitHub](https://img.shields.io/github/stars/gitmotion/ntfy-me-mcp?style=social)](https://github.com/gitmotion/ntfy-me-mcp)

A streamlined [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for sending and fetching notifications via [ntfy](https://ntfy.sh) (public or self-hosted, with token support).

This Docker image runs the stdio MCP server in a minimal, unprivileged container on Node 24 Alpine, built for both `linux/amd64` and `linux/arm64`.

---

## Quickstart

Run interactively on stdio with an environment variable for your ntfy topic:

```bash
docker run -i --rm \
  -e NTFY_TOPIC="my_alerts" \
  gitmotion/ntfy-me-mcp:latest
```

With a self-hosted ntfy instance and access token:

```bash
docker run -i --rm \
  -e NTFY_URL="https://ntfy.example.com" \
  -e NTFY_TOPIC="my_alerts" \
  -e NTFY_TOKEN="tk_your_access_token" \
  gitmotion/ntfy-me-mcp:latest
```

---

## MCP Client Configuration

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "ntfy-me-mcp": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "NTFY_TOPIC=my_alerts",
        "gitmotion/ntfy-me-mcp:latest"
      ]
    }
  }
}
```

### VS Code / Cursor (`mcp.json`)

```json
{
  "servers": {
    "ntfy-me-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "NTFY_TOPIC=my_alerts",
        "gitmotion/ntfy-me-mcp:latest"
      ]
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NTFY_TOPIC` | **Yes** | — | Default ntfy topic name to publish and fetch from (`[A-Za-z0-9_-]+`, max 128 chars). |
| `NTFY_URL` | No | `https://ntfy.sh` | ntfy server URL (`http:` or `https:`). Supports self-hosted instances. |
| `NTFY_TOKEN` | No | — | Bearer access token for protected topics. |

---

## Available Registries & Architectures

- **Docker Hub:** `gitmotion/ntfy-me-mcp`
- **GitHub Packages (GHCR):** `ghcr.io/gitmotion/ntfy-me-mcp`
- **Architectures:** Multi-arch `linux/amd64` and `linux/arm64`

Tags available: `latest`, semantic version tags (e.g. `1.5.0`), and commit short SHAs (e.g. `sha-63598a9f2b64`).

---

## MCP Tools Exposed

1. **`ntfy_me`**: Publish notifications to an ntfy topic.
   - Parameters: `message`, `topic` (optional override), `title`, `priority` (`min`, `low`, `default`, `high`, `urgent`), `tags` (emojis or tags), `markdown` (auto-detected), `actions` (auto-detected URLs or custom view actions).
2. **`ntfy_me_fetch`**: Fetch and filter cached notifications from an ntfy topic.
   - Parameters: `topic` (optional override), `since` (duration or unix timestamp, default `10m`), `scheduled`, `messageId`, `messageTitle`, `messageText`, `priority`.

---

## Links

- **Source Code & Documentation:** [github.com/gitmotion/ntfy-me-mcp](https://github.com/gitmotion/ntfy-me-mcp)
- **Bug Tracker:** [github.com/gitmotion/ntfy-me-mcp/issues](https://github.com/gitmotion/ntfy-me-mcp/issues)
- **ntfy Documentation:** [docs.ntfy.sh](https://docs.ntfy.sh)
