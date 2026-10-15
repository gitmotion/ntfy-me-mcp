---
name: ntfy-me-setup
description: Guide users through installing and configuring ntfy-me-mcp in AI coding clients like Claude Code, VS Code, Codex, and Cursor, including topic selection and tokens.
---

# ntfy-me Setup Skill

This skill guides AI coding assistants in helping users install, configure, and verify the `ntfy-me-mcp` Model Context Protocol (MCP) server in their AI development environment.

## Step 1: Choose Topic and Server

1. **Server (`NTFY_URL`)**:
   - Default: `https://ntfy.sh` (public cloud server).
   - Self-hosted: Specify your custom base URL, e.g., `https://ntfy.example.com`.

2. **Topic Name (`NTFY_TOPIC`)**:
   - On public servers (`ntfy.sh`), topic names are shared and unauthenticated by default.
   - Choose a long, unguessable string (e.g., generate a UUID or random suffix: `my-dev-alerts-9a8f2c71`).
   - Allowed characters: alphanumeric, underscores (`_`), and hyphens (`-`). Length: 1–128 characters.

3. **Access Token (`NTFY_TOKEN`)**:
   - If using an authenticated topic on a self-hosted instance or ntfy.sh with user accounts, obtain a token (`tk_...`) and configure `NTFY_TOKEN`.
   - Never commit tokens to public repositories.

---

## Step 2: Install and Configure Client

### Claude Code

Add the MCP server using the CLI:

```bash
claude mcp add ntfy-me npx -y ntfy-me-mcp \
  -e NTFY_TOPIC="your-unique-topic-here"
```

For self-hosted instances with authentication:

```bash
claude mcp add ntfy-me npx -y ntfy-me-mcp \
  -e NTFY_URL="https://ntfy.example.com" \
  -e NTFY_TOPIC="your-topic" \
  -e NTFY_TOKEN="your-token"
```

---

### VS Code / Claude Desktop / Cline (`mcp.json`)

Add to `mcp.json` or your extension's MCP configuration:

```json
{
  "mcpServers": {
    "ntfy-me": {
      "command": "npx",
      "args": ["-y", "ntfy-me-mcp"],
      "env": {
        "NTFY_TOPIC": "your-unique-topic-here",
        "NTFY_URL": "https://ntfy.sh"
      }
    }
  }
}
```

*Tip for VS Code*: To avoid storing tokens in plain text in `settings.json`, use VS Code's input resolution or environment variables.

---

### OpenAI Codex (`config.toml`)

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.ntfy_me]
command = "npx"
args = ["-y", "ntfy-me-mcp"]

[mcp_servers.ntfy_me.env]
NTFY_TOPIC = "your-unique-topic-here"
NTFY_URL = "https://ntfy.sh"
```

---

### Cursor

1. Open **Cursor Settings** -> **Features** -> **MCP Servers**.
2. Click **+ Add New MCP Server**.
3. Set:
   - **Type**: `command`
   - **Name**: `ntfy-me`
   - **Command**: `npx -y ntfy-me-mcp`
   - Set environment variable `NTFY_TOPIC` to your chosen topic.

---

## Step 3: Subscribe to the Topic on Your Device

To receive alerts on your phone or workstation:

1. **Mobile App**:
   - Install the official **ntfy** app from [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy), [F-Droid](https://f-droid.org/packages/io.heckel.ntfy/), or the [iOS App Store](https://apps.apple.com/app/ntfy/id1625396347).
   - Tap **+** and subscribe to your topic name. If self-hosted, enter the server URL.
2. **Web / Desktop**:
   - Visit `https://ntfy.sh/<your-topic>` (or your self-hosted URL).
   - Enable browser notifications.

---

## Step 4: Verify with a Test Notification

Once configured, verify the connection by calling `ntfy_me`:

```json
{
  "title": "ntfy-me Connection Verified",
  "message": "ntfy-me-mcp successfully connected to your AI assistant!",
  "tags": ["tada", "white_check_mark"],
  "priority": "default"
}
```
