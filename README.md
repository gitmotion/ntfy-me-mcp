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

ntfy-me-mcp provides AI assistants with the ability to send real-time notifications to your devices through the [ntfy](https://ntfy.sh) service (either public or selfhosted with token support). Get notified when your AI completes tasks, encounters errors, or reaches important milestones - all without constant monitoring.

The server includes intelligent features like automatic URL detection for creating view actions and smart markdown formatting detection, making it easier for AI assistants to create rich, interactive notifications without extra configuration.

<img src="https://m2tg1pnwn0.ufs.sh/f/GMqNN8nd9I8lvhAeasbt6OQorL7fKJdgMSekE0Wanp5HXNIm" alt="autodetect-preview" width=50%>

### Available via:

| Name         | Link / Badge                                                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  |
| Glama.ai     | <a href="https://glama.ai/mcp/servers/@gitmotion/ntfy-me-mcp"><img width="250" src="https://glama.ai/mcp/servers/@gitmotion/ntfy-me-mcp/badge" alt="ntfy-me-mcp MCP server" /></a> |
| Smithery.ai  | [![smithery badge](https://smithery.ai/badge/@gitmotion/ntfy-me-mcp)](https://smithery.ai/server/@gitmotion/ntfy-me-mcp)                                                           |
| MseeP.ai     | <a href="https://mseep.ai/app/gitmotion-ntfy-me-mcp"><img width="150" src="https://mseep.net/pr/gitmotion-ntfy-me-mcp-badge.png" alt="ntfy-me-mc-mseepai" /></a>                   |
| Archestra.ai | [![Trust Score](https://archestra.ai/mcp-catalog/api/badge/quality/gitmotion/ntfy-me-mcp)](https://archestra.ai/mcp-catalog/gitmotion__ntfy-me-mcp)</a>                            |

## Table of Contents

- [Features](#features)
  - [Coming soon...](#coming-soon)
- [Quickstart - MCP Server Configuration](#quickstart---mcp-server-configuration)
  - [Configuration Examples](#configuration-examples)
  - [VS Code Token Input Example](#vs-code-token-input-example)
- [Installation](#installation)
  - [Option 1: Install Globally](#option-1-install-globally)
  - [Option 2: Run with npx](#option-2-run-with-npx)
  - [Option 3: Install Locally](#option-3-install-locally)
  - [Option 4: Build and Use Locally](#option-4-build-and-use-locally-with-node-command)
    - [Using locally built server with MCP](#using-locally-built-server-with-mcp)
  - [Option 5: MCP Marketplace Installations](#option-5-mcp-marketplace-installations)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Authentication](#authentication)
  - [Setting Up the Notification Receiver](#setting-up-the-notification-receiver)
  - [Sending Notifications (ntfy_me tool)](#sending-notifications-ntfy_me-tool)
    - [Using Natural Language](#using-natural-language)
    - [Message Parameters](#message-parameters)
    - [Action Links](#action-links)
    - [Emoji Shortcodes](#emoji-shortcodes)
    - [Markdown Formatting](#markdown-formatting)
  - [Retrieving Messages (ntfy_me_fetch tool)](#retrieving-messages-ntfy_me_fetch-tool)
    - [Using Natural Language](#using-natural-language-1)
    - [Message Parameters](#message-parameters-1)
    - [Examples](#examples)
  - [Development](#development)
    - [Building from Source](#building-from-source)
- [License](#license)
- [Contributing](#contributing)

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

### (Coming soon...)

- 📨 **Email**: Send notifications to email (requires ntfy email server configuration)
- 🔗 **Click urls**: Ability to customize click urls
- 🖼️ **Image urls**: Intelligent image url detection to automatically include image urls in messages and notifications
- 🏁 and more!

## Quickstart - MCP Server Configuration

Choose the config shape that matches your client. All examples below use `NTFY_TOPIC` as the required variable and keep the optional auth settings commented out until you need them.

### Configuration Examples

<table>
  <thead>
    <tr>
      <th>Type</th>
      <th>Use when</th>
      <th>Example</th>
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
      <td>Use a local checkout when you are developing or changing the server yourself.</td>
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
      <td>Use a containerized setup when Docker is already part of your environment.</td>
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
      <td>Use OpenCode's local launcher format when configuring MCP there.</td>
      <td>
        <details>
          <summary>Show config</summary>
          <pre><code>{
  "ntfy-me-mcp": {
    "enabled": true,
    "type": "local",
    "command": ["npx", "-y", "ntfy-me-mcp"],
    "environment": {
      "NTFY_TOPIC": "your-ntfy-topic",
      "NTFY_URL": "https://ntfy.sh",
      // "NTFY_TOKEN": "add-your-ntfy-token"
    }
  }
}</code></pre>
        </details>
      </td>
    </tr>
  </tbody>
</table>

Docker images:

- `gitmotion/ntfy-me-mcp:latest` (Docker Hub)
- `ghcr.io/gitmotion/ntfy-me-mcp:latest` (GitHub Container Registry)

Replace `/absolute/path/to/ntfy-me-mcp/build/index.js` with the real path on your machine after running `npm run build`.

### VS Code Token Input Example

> [!NOTE]
> Since `v1.4.0`, the `PROTECTED_TOPIC` env has been removed. This handling is now auto-detected from the unresolved `NTFY_TOKEN` input reference instead.

If your client supports prompt-based secret inputs (i.e. VS Code), prefer that over hardcoding `NTFY_TOKEN` in config files. (Otherwise use your token directly)

Use matching values like this in your `mcp.json` file:

| Field | Value | Purpose |
| --- | --- | --- |
| `env.NTFY_TOKEN` | `"${input:ntfy_token}"` | References the secure prompt-backed token value |
| `inputs[].id` | `"ntfy_token"` | Defines the input name used by `NTFY_TOKEN` |
| `inputs[].type` | `"promptString"` | Prompts the user for the token at runtime |

<details>
<summary>Show VS Code mcp.json example</summary>

```jsonc
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

</details>

- Add this to your VS Code `mcp.json` file, either the user-level file or your workspace `.vscode/mcp.json`
- Set `NTFY_TOKEN` exactly to `"${input:ntfy_token}"` when you want VS Code to treat it as a secure prompt-backed value.

If the client resolves `"${input:ntfy_token}"` before launch, the server receives the real token directly. If the placeholder is passed through unchanged, ntfy-me-mcp detects that unresolved input reference and prompts for the token itself at startup.

## Installation

If you need to install and run the server directly (alternative to the MCP configuration above):

### Option 1: Install globally

```bash
npm install -g ntfy-me-mcp
```

### Option 2: Run with npx

```bash
npx ntfy-me-mcp
```

### Option 3: Install locally

<details>
<summary>Show local install steps</summary>

```bash
# Clone the repository
git clone https://github.com/gitmotion/ntfy-me-mcp.git
cd ntfy-me-mcp

# Install dependencies
npm install

# Copy the example environment file and configure it
cp .env.example .env
# Edit .env with your preferred editor and update the variables
# nano .env  # or use your preferred editor

# Build the project
npm run build

# Start the server
npm start
```

</details>

### Option 4: Build and use locally with node command

If you're developing or customizing the server, you might want to run it directly with node:

<details>
<summary>Show local build steps</summary>

```bash
# Clone the repository
git clone https://github.com/gitmotion/ntfy-me-mcp.git
cd ntfy-me-mcp

# Install dependencies
npm install

# Copy the example environment file and configure it
cp .env.example .env
# Edit the .env file to set your NTFY_TOPIC and other optional settings
# nano .env  # or use your preferred editor

# Build the project
npm run build

# Run using node directly
npm start
```

</details>

#### Using locally built server with MCP

When configuring your MCP to use a locally built version, specify the node command and path to the built index.js file:

<details>
<summary>Show local MCP config</summary>

```jsonc
{
  "ntfy-me": {
    "command": "node",
    "args": ["/path/to/ntfy-mcp/build/index.js"],
    "env": {
      "NTFY_TOPIC": "your-topic-name",
      //"NTFY_URL": "https://your-ntfy-server.com", // Use if using a self-hosted server
      //"NTFY_TOKEN": "your-auth-token" // Use if using a protected topic/server
    }
  }
}
```

</details>

For secure token handling in VS Code, replace the commented `NTFY_TOKEN` line with `"NTFY_TOKEN": "${input:ntfy_token}"` and define the `ntfy_token` prompt in the same `mcp.json` file under the top-level `inputs` array.

Remember to use the absolute path to your build/index.js file in the args array.

### Option 5: MCP Marketplace installations

#### Installing via Smithery

To install ntfy-me-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@gitmotion/ntfy-me-mcp):

```bash
npx -y @smithery/cli install @gitmotion/ntfy-me-mcp --client claude
```

## Configuration

### Environment Variables

Create a `.env` file in your project directory by copying the provided example:

```bash
# Copy the example file
cp .env.example .env

# Edit the file with your preferred editor
nano .env  # or vim, code, etc.
```

Your `.env` file should contain these variables:

<details>
<summary>Show example .env</summary>

```dotenv
# Required
NTFY_TOPIC=your-topic-name

# Optional - Configure these if using a private/protected ntfy server
# NTFY_URL=https://ntfy.sh  # Default is ntfy.sh, change to your self-hosted ntfy server URL if needed
                            # Include port if needed, e.g., https://your-ntfy-server.com:8443
# NTFY_TOKEN=your-access-token  # Required for authentication with protected topics/servers
```

</details>

## Usage

### Authentication

This server supports both authenticated and unauthenticated ntfy endpoints:

- **Public Topics**: When using public topics on ntfy.sh or other public servers, no authentication is required.
- **Protected Topics**: For protected topics or private servers, you need to provide an access token.

If authentication is required but not provided, you'll receive a clear error message explaining how to add your token.

### Setting Up the Notification Receiver

1. Install the [ntfy app](https://ntfy.sh/app) on your device
2. Subscribe to your chosen topic (the same as your `NTFY_TOPIC` setting)

### Sending Notifications (ntfy_me tool)

This section covers all functionality related to sending notifications using the ntfy_me tool.

#### Using Natural Language

When working with your AI assistant, you can use natural phrases like:

```
"Send me a notification when the build is complete"
"Notify me when the task is done"
"Alert me after generating the code"
"Message me when the process finishes"
"Send an alert with high priority"
```

#### Message Parameters

The tool accepts these parameters:

| Parameter   | Description                                            | Required |
| ----------- | ------------------------------------------------------ | -------- |
| taskTitle   | The notification title                                 | Yes      |
| taskSummary | The notification body                                  | Yes      |
| priority    | Message priority: min, low, default, high, max         | No       |
| tags        | Array of notification tags (supports emoji shortcodes) | No       |
| markdown    | Boolean to enable markdown formatting (true/false)     | No       |
| actions     | Array of view action objects for clickable links       | No       |

Example:

```javascript
{
  taskTitle: "Code Generation Complete",
  taskSummary: "Your React component has been created successfully with proper TypeScript typing.",
  priority: "high",
  tags: ["check", "code", "react"]
}
```

This will send a high-priority notification with a checkmark emoji.

#### Action Links

You can add clickable action buttons to your notifications using the `actions` parameter, or let the server automatically detect URLs in your message.

##### Automatic URL Detection

When URLs are present in the message body, the server automatically creates up to 3 view actions (ntfy's maximum limit) from the first detected URLs. This makes it easy to include clickable links without manually specifying the actions array.

For example, this message:

```javascript
{
  taskTitle: "Build Complete",
  taskSummary: "Your PR has been merged! View the changes at https://github.com/org/repo/pull/123 or check the deployment at https://staging.app.com"
}
```

Will automatically generate view actions for both URLs, making them easily clickable in the notification.

##### Manual Action Configuration

For more control, you can manually specify actions:

| Property | Description                                       | Required |
| -------- | ------------------------------------------------- | -------- |
| action   | Must be "view"                                    | Yes      |
| label    | Button text to display                            | Yes      |
| url      | URL to open when clicked                          | Yes      |
| clear    | Whether to clear notification on click (optional) | No       |

Example with action links:

<details>
<summary>Show action links example</summary>

```javascript
{
  taskTitle: "Pull Request Review",
  taskSummary: "Your code has been reviewed and is ready for final checks",
  priority: "high",
  tags: ["check", "code"],
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
}
```

</details>

#### Emoji Shortcodes

You can use emoji shortcodes in your tags for visual indicators:

- `warning` → ⚠️
- `check` → ✅
- `rocket` → 🚀
- `tada` → 🎉

See the [full list of supported emoji shortcodes](https://docs.ntfy.sh/emojis/).

#### Markdown Formatting

Your notifications support rich markdown formatting with intelligent detection! When you include markdown syntax in your `taskSummary`, the server automatically detects it and enables markdown parsing - no need to set `markdown: true` explicitly.

##### Automatic Detection

The server checks for common markdown patterns like:

- Headers (#, ##, etc.)
- Lists (-, \*, numbers)
- Code blocks (```)
- Links ([text](url))
- Bold/italic (_text_, **text**)

When these patterns are detected, markdown parsing is automatically enabled for the message.

##### Manual Override

While automatic detection works in most cases, you can still explicitly control markdown parsing:

```javascript
{
  taskTitle: "Task Complete",
  taskSummary: "Regular plain text message",
  markdown: false  // Force disable markdown parsing
}
```

### Retrieving Messages (ntfy_me_fetch tool)

This section covers all functionality related to fetching and filtering messages using the ntfy_me_fetch tool.

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

#### Message Parameters

The tool accepts these parameters:

| Parameter    | Description                                                                            | Required |
| ------------ | -------------------------------------------------------------------------------------- | -------- |
| ntfyTopic    | Topic to fetch messages from (defaults to NTFY_TOPIC env var)                          | No       |
| since        | How far back to retrieve messages ('10m', '1h', '1d', timestamp, message ID, or 'all') | No       |
| messageId    | Find a specific message by its ID                                                      | No       |
| messageText  | Find messages containing exact text content                                            | No       |
| messageTitle | Find messages with exact title/subject                                                 | No       |
| priorities   | Find messages with specific priority levels                                            | No       |
| tags         | Find messages with specific tags                                                       | No       |

#### Examples

1. **Fetch Recent Messages**

```javascript
{
  since: "30m"; // Get messages from last 30 minutes
}
```

2. **Filter by Title and Priority**

```javascript
{
  messageTitle: "Build Complete",
  priorities: "high",
  since: "1d"
}
```

3. **Search Different Topic with Tags**

```javascript
{
  ntfyTopic: "updates",
  tags: ["error", "warning"],
  since: "all"
}
```

4. **Find Specific Message**

```javascript
{
  messageId: "xxxxXXXXxxxx";
}
```

Messages are returned with full details including:

- Message ID and timestamp
- Topic and title
- Content and priority
- Tags and attachments
- Action links and expiration

> **Note**: Message history availability depends on your ntfy server's cache settings. The public ntfy.sh server typically caches messages for 12 hours.

## Development & Contributions

Development and contribution guidance now lives in [CONTRIBUTING.md](CONTRIBUTING.md), including setup steps and the npm scripts reference.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [gitmotion](https://github.com/gitmotion)
