# <img src="https://m2tg1pnwn0.ufs.sh/f/GMqNN8nd9I8l9tUbmif1CnFX8Baqr7mHeicYu0AULDyNVWJE" width=30 /> ntfy-me-mcp

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.29.0-green.svg?logo=anthropic)](https://modelcontextprotocol.io/)
[![NPM Version](https://img.shields.io/npm/v/ntfy-me-mcp.svg?logo=npm&color=orange)](https://www.npmjs.com/package/ntfy-me-mcp)
[![Docker Image Version](https://img.shields.io/docker/v/gitmotion/ntfy-me-mcp?logo=docker&label=Docker)](https://hub.docker.com/r/gitmotion/ntfy-me-mcp)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/github/stars/gitmotion/ntfy-me-mcp?style=social)](https://github.com/gitmotion/ntfy-me-mcp)
<a href="https://www.buymeacoffee.com/gitmotion" target="_blank" rel="noopener noreferrer">
<img src="https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png" alt="Buy me a coffee" width="105px" />
</a>

> A streamlined Model Context Protocol (MCP) server for sending notifications via ntfy service (public or selfhosted with token support) 📲

## Overview

ntfy-me-mcp provides AI assistants with the ability to send real-time notifications to your devices through the [ntfy.sh](https://ntfy.sh) service (either public or selfhosted with token support). Get notified when your AI completes tasks, encounters errors, or reaches important milestones - all without constant monitoring.

The server includes intelligent features like automatic URL detection for creating view actions and smart markdown formatting detection, making it easier for AI assistants to create rich, interactive notifications without extra configuration.

<table>
  <thead>
    <tr>
      <th width="50%">Preview</th>
      <th width="50%">Available via</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top"><img src="https://m2tg1pnwn0.ufs.sh/f/GMqNN8nd9I8lvhAeasbt6OQorL7fKJdgMSekE0Wanp5HXNIm" alt="autodetect-preview" width="100%"></td>
      <td valign="top">
        <table>
          <thead>
            <tr><th>Name</th><th>Link / Badge</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>ntfy.sh</td>
              <td><a href="https://docs.ntfy.sh/integrations/#projects-scripts">Featured on ntfy.sh</a></td>
            </tr>
            <tr>
              <td>Glama.ai</td>
              <td><a href="https://glama.ai/mcp/servers/@gitmotion/ntfy-me-mcp"><img width="250" src="https://glama.ai/mcp/servers/@gitmotion/ntfy-me-mcp/badge" alt="ntfy-me-mcp MCP server" /></a></td>
            </tr>
            <tr>
              <td>LightNow</td>
              <td><a href="https://lightnow.ai/servers/io.github.gitmotion/ntfy-me-mcp"><img src="https://lightnow.ai/badge/io.github.gitmotion/ntfy-me-mcp" alt="LightNow capabilities" /></a></td>
            </tr>
            <tr>
              <td>MseeP.ai</td>
              <td><a href="https://mseep.ai/app/gitmotion-ntfy-me-mcp"><img width="150" src="https://mseep.net/pr/gitmotion-ntfy-me-mcp-badge.png" alt="ntfy-me-mc-mseepai" /></a></td>
            </tr>
            <tr>
              <td>Archestra.ai</td>
              <td><a href="https://archestra.ai/mcp-catalog/gitmotion__ntfy-me-mcp"><img src="https://archestra.ai/mcp-catalog/api/badge/quality/gitmotion/ntfy-me-mcp" alt="Trust Score" /></a></td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>

## Features
- 🚀 **Quick Setup**: Run with npx or docker!
- 🔔 **Real-time Notifications**: Get updates on your phone/desktop when tasks complete
- 🎨 **Rich Notifications**: Support for topic, title, priorities, emoji tags, and detailed messages
- 🔍 **Notification Fetching**: Fetch and filter cached messages from your ntfy topics
- 🎯 **Smart Action Links**: Automatically detects URLs in messages and creates view actions
- 📄 **Intelligent Markdown**: Auto-detects and enables markdown formatting when present
- 🔒 **Secure**: Optional authentication with access tokens
- 🔑 **Input Masking**: Securely store your ntfy token in your vs config!
- 🌐 **Self-hosted Support**: Works with both ntfy.sh and self-hosted ntfy instances

#### Coming soon...
- 📨 **Email**: Send notifications to email (requires ntfy email server configuration)
- 🔗 **Click urls**: Ability to customize click urls
- 🖼️ **Image urls**: Intelligent image url detection to automatically include image urls in messages and notifications
- 🏁 and more!

## Table of Contents

<table>
  <thead>
    <tr>
      <th>Section</th>
      <th>Topics</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="#quickstart---mcp-server-configuration">Quickstart - MCP Server Configuration</a></td>
      <td>
        <a href="#configuration-examples">Configuration Examples</a>
      </td>
    </tr>
    <tr>
      <td><a href="#installation">Installation</a></td>
      <td>
        <a href="#setting-up-the-notification-receiver">Setting Up the Notification Receiver</a>
      </td>
    </tr>
    <tr>
      <td><a href="#configuration">Configuration</a></td>
      <td>
        <a href="#environment-variables">Environment Variables</a><br/>
        <a href="#authentication">Authentication</a><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;<a href="#secure-token-handling-vscode">↳ Secure Token Handling (vscode)</a>
      </td>
    </tr>
    <tr>
      <td><a href="#tools--usage">Tools &amp; Usage</a></td>
      <td>
        <a href="#ntfy_me-sending-notifications">ntfy_me: Sending Notifications</a><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;<a href="#using-natural-language">↳ Using Natural Language</a><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;<a href="#example-usage">↳ Example Usage</a><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;<a href="#message-parameters">↳ Message Parameters</a><br/>
        <a href="#ntfy_me_fetch-polling-notifications">ntfy_me_fetch: Polling Notifications</a><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;<a href="#using-natural-language-1">↳ Using Natural Language</a><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;<a href="#example-usage-1">↳ Example Usage</a><br/>
        &nbsp;&nbsp;&nbsp;&nbsp;<a href="#fetch-parameters">↳ Fetch Parameters</a>
      </td>
    </tr>
    <tr>
      <td><a href="#development--contributions">Development &amp; Contributions</a></td>
      <td></td>
    </tr>
    <tr>
      <td><a href="#license">License</a></td>
      <td></td>
    </tr>
  </tbody>
</table>

## Quickstart - MCP Server Configuration

Choose the config shape that matches your client. All examples below use `NTFY_TOPIC` as the required variable and keep the optional auth settings commented out until you need them.

### Configuration Examples

<table>
  <thead>
    <tr>
      <th width="20%">Type</th>
      <th width="40%">Use Case</th>
      <th width="40%">Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>NPM / NPX</td>
      <td>Recommended for most MCP clients when you want the lightest setup.</td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "ntfy-me-mcp": {
    "command": "npx",
    "args": ["-y", "ntfy-me-mcp"],
    "env": {
      "NTFY_TOPIC": "your-ntfy-topic",
      "NTFY_URL": "https://ntfy.sh",
      // "NTFY_TOKEN": "add-your-ntfy-token"
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td>Local</td>
      <td>Use a local checkout when you are developing or changing the server yourself.
        <br>Replace <code>/absolute/path/to/ntfy-me-mcp/build/index.js</code> after building.
      </td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "ntfy-me-mcp": {
    "command": "node",
    "args": ["/absolute/path/to/ntfy-me-mcp/build/index.js"],
    "env": {
      "NTFY_TOPIC": "your-ntfy-topic",
      "NTFY_URL": "https://ntfy.sh",
      // "NTFY_TOKEN": "add-your-ntfy-token"
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td>Docker</td>
      <td>Use a containerized setup when Docker is already part of your environment.
        <br/>&nbsp;&nbsp; - DockerHub: <code>gitmotion/ntfy-me-mcp:latest</code><br/>&nbsp;&nbsp; - GHCR: <code>ghcr.io/gitmotion/ntfy-me-mcp:latest</code>
      </td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "ntfy-me-mcp": {
    "command": "docker",
    "args": [
      "run",
      "-i",
      "--rm",
      "-e",
      "NTFY_TOPIC",
      "-e",
      "NTFY_URL",
      "-e",
      "NTFY_TOKEN",
      "gitmotion/ntfy-me-mcp:latest"
    ],
    "env": {
      "NTFY_TOPIC": "your-ntfy-topic",
      "NTFY_URL": "https://ntfy.sh",
      // "NTFY_TOKEN": "add-your-ntfy-token"
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td>OpenCode</td>
      <td>Add to <code>opencode.json</code> in your project root (for project-level config) or <code>~/.config/opencode/opencode.json</code> (for global config). Uses <code>"mcp"</code> as the top-level key with <code>type: "local"</code> and <code>command</code> as an array.</td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "ntfy-me-mcp": {
      "type": "local",
      "command": ["npx", "-y", "ntfy-me-mcp"],
      "environment": {
        "NTFY_TOPIC": "your-ntfy-topic",
        "NTFY_URL": "https://ntfy.sh",
        // "NTFY_TOKEN": "add-your-ntfy-token"
      }
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td>ClaudeCode</td>
      <td>Add to <code>.mcp.json</code> at your project root (shared with your team via version control), or to <code>~/.claude.json</code> for user-level access across all projects.</td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "mcpServers": {
    "ntfy-me-mcp": {
      "command": "npx",
      "args": ["-y", "ntfy-me-mcp"],
      "env": {
        "NTFY_TOPIC": "your-ntfy-topic",
        "NTFY_URL": "https://ntfy.sh",
        "NTFY_TOKEN": "${NTFY_TOKEN}"
      }
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td>Copilot CLI</td>
      <td>Add to <code>~/.copilot/mcp-config.json</code> for user-level access across all sessions. Use <code>type: "local"</code> for stdio-based servers like this one.</td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "mcpServers": {
    "ntfy-me-mcp": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "ntfy-me-mcp"],
      "env": {
        "NTFY_TOPIC": "your-ntfy-topic",
        "NTFY_URL": "https://ntfy.sh",
        "NTFY_TOKEN": "your-access-token"
      },
      "tools": ["*"]
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td>Token Auth</td>
      <td>Required for protected topics or self-hosted servers. See <a href="#secure-token-handling-vscode">Secure Token Handling (vscode)</a> or set <code>NTFY_TOKEN</code> directly.</td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "ntfy-me-mcp": {
    "command": "npx",
    "args": ["-y", "ntfy-me-mcp"],
    "env": {
      "NTFY_TOPIC": "your-ntfy-topic",
      "NTFY_URL": "https://your-ntfy-server.com",
      "NTFY_TOKEN": "your-access-token"
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
  </tbody>
</table>

## Installation

If you need to install and run the server directly (alternative to the MCP configuration above):

<table>
  <thead>
    <tr>
      <th>Option</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top"><b>Install globally</b><br/>Install once, run anywhere with the <code>ntfy-me-mcp</code> command.</td>
      <td>
        <code>npm install -g ntfy-me-mcp</code>
      </td>
    </tr>
    <tr>
      <td valign="top"><b>Run with npx</b><br/>No install needed — ideal for a quick one-off run or testing.</td>
      <td>
        <code>npx ntfy-me-mcp</code>
      </td>
    </tr>
    <tr>
      <td valign="top"><b>Install locally</b><br/>Clone the repo, install deps, build, and run via <code>npm start</code>.</td>
      <td>
        <details>
          <summary>Show steps</summary>
          <pre><code># Clone repo, install deps, configure .env, build, run<br/>
git clone https://github.com/gitmotion/ntfy-me-mcp.git
cd ntfy-me-mcp
npm install
cp .env.example .env
npm run build
npm start
</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td valign="top"><b>MCP Marketplace — Smithery</b><br/>One-command install for Claude Desktop via <a href="https://smithery.ai/server/@gitmotion/ntfy-me-mcp">Smithery</a>.</td>
      <td>
        <details>
          <summary>Show command</summary>
          <pre><code>npx -y @smithery/cli install @gitmotion/ntfy-me-mcp --client claude</code></pre>
        </details>
      </td>
    </tr>
  </tbody>
</table>

### Setting Up the Notification Receiver

<details>
<summary>View ntfy receiver Section</summary>

1. Install the [ntfy app](https://ntfy.sh/app) on your device
    - or deploy your own ntfy server: https://docs.ntfy.sh/install/
2. Subscribe to your chosen topic (the same as your `NTFY_TOPIC` setting)

</details>

## Configuration

### Environment Variables

Create a `.env` file by copying the example: `cp .env.example .env` — see [`.env.example`](.env.example) for reference.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `NTFY_TOPIC` | Yes | — | The ntfy topic to publish notifications to |
| `NTFY_URL` | No | `https://ntfy.sh` | ntfy server URL — change this for self-hosted instances<br/>(include port if needed, e.g. `https://your-server.com:8443`) |
| `NTFY_TOKEN` | No | — | Access token for protected topics or private servers |

### Authentication

<details>
<summary>View Authentication Section</summary>

This MCP server supports both authenticated and unauthenticated ntfy endpoints:

- **Public Topics**: When using public topics on ntfy.sh or other public servers, no authentication is required.
- **Protected Topics**: 
  - For protected topics or private servers, you need to provide an access token via `NTFY_TOKEN` env variable or in the `accessToken` parameter of the tool.
  - If authentication is required but not provided, you'll receive a clear error message explaining how to add your token.

#### Secure Token Handling (vscode)

- If your client supports prompt-based secret inputs (i.e. VS Code), prefer that over hardcoding `NTFY_TOKEN` in config files. (Otherwise use your token directly)
- Use matching values like this in your `mcp.json` file:

<details>
<summary>Show VS Code mcp.json example</summary>

```jsonc
// Add this to your VS Code `mcp.json` file, either the user-level file or your workspace `.vscode/mcp.json`
// Set `NTFY_TOKEN` exactly to `"${input:ntfy_token}"` when you want VS Code to treat it as a secure prompt-backed value.

{
  "inputs": [
    {
      "type": "promptString",
      "id": "ntfy_token",
      "description": "Ntfy Token",
      "password": true
    }
  ],
  "servers": {
    "ntfy-me-mcp": {
      "command": "npx",
      "args": ["-y", "ntfy-me-mcp"],
      "env": {
        "NTFY_TOPIC": "your-ntfy-topic",
        "NTFY_URL": "https://your-ntfy-server.com",
        "NTFY_TOKEN": "${input:ntfy_token}"
      }
    }
  }
}
```

<br/>

</details>

| Field | Value | Purpose |
| --- | --- | --- |
| `env.NTFY_TOKEN` | `"${input:ntfy_token}"` | References the secure prompt-backed token value |
| `inputs[].id` | `"ntfy_token"` | Defines the input name used by `NTFY_TOKEN` |
| `inputs[].type` | `"promptString"` | Prompts the user for the token at runtime |


> If the client resolves `"${input:ntfy_token}"` before launch, the server receives the real token directly. If the placeholder is passed through unchanged, ntfy-me-mcp detects that unresolved input reference and prompts for the token itself at startup.
>
> Since `v1.4.0+`, the `PROTECTED_TOPIC` env has been removed. This handling is now auto-detected from the unresolved `NTFY_TOKEN` input reference instead.

</details>

## Tools & Usage

### `ntfy_me`: Sending Notifications

#### Using Natural Language

- When working with your AI assistant, you can use natural phrases to request notifications:

```
"ntfyme with a summary of the task when complete"
"Send me a notification when the build is complete"
"Notify me when the task is done"
"Alert me after generating the code"
"Message me when the process finishes"
"Send an alert with high priority"
```

#### Example Usage

<table>
  <thead>
    <tr>
      <th width="50%">Input</th>
      <th width="50%">Output</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top"><pre><code>{
  "title": "Code Generation Complete",
  "message": "Your React component has been
created successfully with proper
TypeScript typing.",
  "priority": "high",
  "tags": ["white_check_mark", "code", "react"]
}</code></pre></td>
      <td valign="top"><pre><code>{
  "success": true,
  "endpoint": "https://ntfy.sh/ntfymetest"
}</code></pre></td>
    </tr>
  </tbody>
</table>

#### Message Parameters

<table>
  <thead>
    <tr>
      <th width="10%">Parameter</th>
      <th width="40%">Description</th>
      <th width="10%">Required</th>
      <th width="40%">Details / Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top"><code>title</code></td>
      <td valign="top">The notification title</td>
      <td valign="top">Yes</td>
      <td valign="top">—</td>
    </tr>
    <tr>
      <td valign="top"><code>message</code></td>
      <td valign="top">The notification body</td>
      <td valign="top">Yes</td>
      <td valign="top">—</td>
    </tr>
    <tr>
      <td valign="top"><code>url</code></td>
      <td valign="top">Custom ntfy server URL</td>
      <td valign="top">No</td>
      <td valign="top"><i>Default: <code>NTFY_URL</code></i></td>
    </tr>
    <tr>
      <td valign="top"><code>topic</code></td>
      <td valign="top">Custom ntfy topic</td>
      <td valign="top">No</td>
      <td valign="top"><i>Default: <code>NTFY_TOPIC</code></i></td>
    </tr>
    <tr>
      <td valign="top"><code>accessToken</code></td>
      <td valign="top">Access token for protected topics</td>
      <td valign="top">No</td>
      <td valign="top"><i>Default: <code>NTFY_TOKEN</code></i></td>
    </tr>
    <tr>
      <td valign="top"><code>priority</code></td>
      <td valign="top">Message priority level</td>
      <td valign="top">No</td>
      <td valign="top"><i>Default: <code>"default"</code></i><br/>Options: <code>min</code>, <code>low</code>, <code>default</code>, <code>high</code>, <code>max</code></td>
    </tr>
    <tr>
      <td valign="top"><code>tags</code></td>
      <td valign="top">Array of notification tags. Supports emoji shortcodes for visual indicators — see the <a href="https://docs.ntfy.sh/emojis/">full list</a>.</td>
      <td valign="top">No</td>
      <td valign="top">
        <code>warning</code> → ⚠️<br/>
        <code>white_check_mark</code> → ✅<br/>
        <code>rocket</code> → 🚀<br/>
        <code>tada</code> → 🎉
      </td>
    </tr>
    <tr>
      <td valign="top"><code>markdown</code></td>
      <td valign="top">Boolean to enable markdown formatting. Auto-detected when markdown syntax is present (headers, lists, code blocks, links, bold/italic) — no need to set explicitly. Can be overridden manually.</td>
      <td valign="top">No</td>
      <td valign="top">
        <i>Auto-detection: no configuration needed.</i><br/><br/>
        <details>
          <summary>Manual override example</summary>
          <pre><code>{
  title: "Task Complete",
  message: "Regular plain text message",
  markdown: false  // Force disable
}</code></pre>
        </details>
      </td>
    </tr>
    <tr>
      <td valign="top"><code>actions</code></td>
      <td valign="top">Array of view action objects for clickable links. URLs in the message body are auto-detected (up to 3 actions). For manual control, each action requires <code>action</code>, <code>label</code>, and <code>url</code>, with an optional <code>clear</code> flag.</td>
      <td valign="top">No</td>
      <td valign="top">
        <details>
          <summary>Auto-detection example</summary>
          <pre><code>{
  title: "Build Complete",
  message: "View at https://github.com/org/repo/pull/123"
}</code></pre>
          Automatically creates view actions for detected URLs.
        </details>
        <details>
          <summary>Manual configuration example</summary>
          <pre><code>{
  title: "Pull Request Review",
  message: "Ready for final checks",
  actions: [
    {
      action: "view",
      label: "View PR",
      url: "https://github.com/org/repo/pull/123"
    },
    {
      action: "view",
      label: "View Changes",
      url: "https://github.com/org/repo/pull/123/files",
      clear: true
    }
  ]
}</code></pre>
        </details>
      </td>
    </tr>
  </tbody>
</table>

### `ntfy_me_fetch`: Polling Notifications

#### Using Natural Language

AI assistants understand various ways to request message fetching:

```
"Show me my recent notifications"
"Get messages from the last hour"
"Find notifications with title 'Build Complete'"
"Search for messages with the test_tube tag"
"Show notifications from the updates topic from the last 24hr"
"Check my latest alerts"
```

#### Example Usage

<table>
  <thead>
    <tr>
      <th width="50%">Input</th>
      <th width="50%">Output</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top"><pre><code>{
  "since": "6h"
}</code></pre></td>
      <td valign="top"><pre><code>{
  "success": true,
  "messageCount": 1,
  "topics": {
    "ntfymetest": [
      {
        "id": "On4Jeo1ENDCB",
        "time": 1775859291,
        "event": "message",
        "topic": "ntfymetest",
        "message": "Test",
        "title": "Test",
        "priority": 3,
        "expires": 1775902491
      }
    ]
  }
}</code></pre></td>
    </tr>
  </tbody>
</table>

#### Fetch Parameters

<table>
  <thead>
    <tr>
      <th>Parameter</th>
      <th>Description</th>
      <th>Required</th>
      <th>Details / Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td valign="top"><code>url</code></td>
      <td valign="top">Custom ntfy server URL</td>
      <td valign="top">No</td>
      <td valign="top"><i>Default: <code>NTFY_URL</code></i></td>
    </tr>
    <tr>
      <td valign="top"><code>topic</code></td>
      <td valign="top">Topic to fetch messages from</td>
      <td valign="top">No</td>
      <td valign="top"><i>Default: <code>NTFY_TOPIC</code></i><br/><br/><code>{ "topic": "updates", "since": "all" }</code></td>
    </tr>
    <tr>
      <td valign="top"><code>accessToken</code></td>
      <td valign="top">Access token for protected topics</td>
      <td valign="top">No</td>
      <td valign="top"><i>Default: <code>NTFY_TOKEN</code></i></td>
    </tr>
    <tr>
      <td valign="top"><code>since</code></td>
      <td valign="top">How far back to retrieve messages</td>
      <td valign="top">No</td>
      <td valign="top">
        Options: <code>'10m'</code>, <code>'1h'</code>, <code>'1d'</code>, timestamp, message ID, or <code>'all'</code><br/>
        Example: <code>{ "since": "30m" }</code>
      </td>
    </tr>
    <tr>
      <td valign="top"><code>messageId</code></td>
      <td valign="top">Find a specific message by its ID</td>
      <td valign="top">No</td>
      <td valign="top"><code>{ "messageId": "xxxxXXXXxxxx" }</code></td>
    </tr>
    <tr>
      <td valign="top"><code>messageText</code></td>
      <td valign="top">Find messages containing exact text content</td>
      <td valign="top">No</td>
      <td valign="top"><code>{ "messageText": "Build Complete" }</code></td>
    </tr>
    <tr>
      <td valign="top"><code>messageTitle</code></td>
      <td valign="top">Find messages with exact title/subject</td>
      <td valign="top">No</td>
      <td valign="top"><code>{ "messageTitle": "Build Complete", "priorities": "high", "since": "1d" }</code></td>
    </tr>
    <tr>
      <td valign="top"><code>priorities</code></td>
      <td valign="top">Find messages with specific priority levels</td>
      <td valign="top">No</td>
      <td valign="top"><code>{ "priorities": "high" }</code></td>
    </tr>
    <tr>
      <td valign="top"><code>tags</code></td>
      <td valign="top">Find messages with specific tags</td>
      <td valign="top">No</td>
      <td valign="top"><code>{ "tags": ["error", "warning"] }</code></td>
    </tr>
  </tbody>
</table>


## Development & Contributions

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md), which include general guidelines, setup steps, etc.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [gitmotion](https://github.com/gitmotion)
