---
name: ntfy-me
description: Send push notifications to mobile and desktop devices via ntfy. Use when long-running tasks finish, builds fail, attention is needed, or the user asks for alerts.
---

# ntfy-me Skill

This skill guides AI coding assistants on how and when to send push notifications to users via `ntfy-me-mcp`.

## When to Notify vs When NOT to Notify

Notifications interrupt the user in the physical world (phone vibration, desktop banner). Use them intentionally:

### DO Notify:
- **Long-running task completion**: Builds, test suites, Docker image builds, or migrations taking more than 30–60 seconds.
- **Failures & blockers**: CI pipeline failures, compilation errors after major refactors, or unexpected exceptions.
- **Human attention required**: The agent is paused waiting for user input, design decisions, or credentials.
- **Explicit user requests**: Any user prompt asking to "notify me", "ping me", "send an alert", or "remind me".

### DO NOT Notify:
- **Routine command success**: Instantaneous commands (<5 seconds) like `git status`, file reads, or minor edits.
- **Intermediate steps**: Avoid spamming incremental progress updates (e.g., do not send a notification for every file touched).
- **Transient debug loops**: Never notify on intermediate test iterations during a local red-green-refactor loop.

### ⚠️ NEVER Include in Notifications:
- **Secrets & credentials**: API keys, passwords, bearer tokens, private keys, SSH keys, session cookies.
- **Sensitive personal data**: Passwords, financial data, or sensitive PII.
- *Reason*: On `ntfy.sh` and unauthenticated self-hosted instances, **topics are public**. Anyone who subscribes to or guesses the topic can read all notification payloads.

---

## Priority Guide

Map urgency to `priority` (1–5 or named levels):

| Level | Name | Typical Use Case | Device Behavior |
|-------|------|------------------|-----------------|
| `1` | `min` | Background metrics, nightly maintenance, routine success | Silent, low visual prominence |
| `2` | `low` | Minor warnings, non-critical lint findings, optional suggestions | Silent, no vibration |
| `3` | `default` | Standard task completion, general progress notifications | Default notification sound & vibration |
| `4` | `high` | Build failure, test suite failure, blocked task needing attention | Louder sound, persistent vibration |
| `5` | `urgent` / `max` | Production outages, data corruption risks, security alerts | Bypasses Do Not Disturb on device |

*Example:*
```json
{
  "title": "Build Failed: ntfy-me-mcp",
  "message": "TypeScript compilation failed with 3 errors in src/index.ts",
  "priority": "high",
  "tags": ["x", "warning"]
}
```

---

## Titles, Messages, and Markdown Formatting

- **Title**: Keep concise (under 60 characters). State status and project/task name clearly.
- **Message**: Provide clear context, error summary or result count, and elapsed time or next action.
- **Markdown**: Set `markdown: true` when using formatting like bold text, inline code, lists, or tables.

*Example:*
```json
{
  "title": "Test Suite Succeeded ✅",
  "message": "All **359 tests** passed in `4.2s` across 15 suites.\n\n- Coverage: 84.2%\n- Status: Ready for PR review",
  "markdown": true,
  "priority": "default",
  "tags": ["white_check_mark", "test_tube"]
}
```

---

## Tags and Emoji Shortcodes

ntfy maps standard emoji shortcodes in `tags` to visual icons on the device:

- Success: `white_check_mark`, `tada`, `rocket`, `package`
- Failure / Warning: `x`, `warning`, `rotating_light`, `skull`
- Information: `information_source`, `bulb`, `speech_balloon`, `wrench`

```json
{
  "title": "Deployment Complete",
  "message": "Service deployed to staging.",
  "tags": ["rocket", "white_check_mark"]
}
```

---

## Action Buttons and Click Links

Make notifications actionable:

- **`click`**: A URL opened when the user taps anywhere on the notification body (`http://`, `https://`, `mailto:`, `geo:`, `ntfy://`).
- **`actions`**: Up to 3 view actions (`max 3`), each having:
  - `label`: Button text (e.g. "View PR", "Open CI Logs").
  - `url`: Destination URL (must be `http://` or `https://`).
  - `clear`: Optional boolean (clears the notification when tapped).

*Example:*
```json
{
  "title": "PR #44 Created",
  "message": "Agent Skills PR opened on gitmotion/ntfy-me-mcp.",
  "click": "https://github.com/gitmotion/ntfy-me-mcp/pull/44",
  "actions": [
    {
      "label": "Review PR",
      "url": "https://github.com/gitmotion/ntfy-me-mcp/pull/44"
    },
    {
      "label": "CI Status",
      "url": "https://github.com/gitmotion/ntfy-me-mcp/actions"
    }
  ],
  "tags": ["octocat", "sparkles"]
}
```

---

## Server Destination & Policy Locks

The server's operator controls destination routing:

1. **Default Destination**: Notifications route to `NTFY_URL` (default `https://ntfy.sh`) and `NTFY_TOPIC`.
2. **Topic Overrides**:
   - By default, `topic` is locked. Tools do not accept arbitrary topics unless `NTFY_ALLOW_TOPIC_OVERRIDE=true`.
   - When `NTFY_TOPICS_ALLOWLIST` is configured, `topic` is restricted strictly to `NTFY_TOPIC` plus the listed topics.
3. **Server URL Overrides**:
   - By default, `url` is locked to `NTFY_URL`.
   - If `NTFY_ALLOW_URL_OVERRIDE=true` is set, `url` can be specified per-call.
4. **Token Security**:
   - `NTFY_TOKEN` is only sent to the configured `NTFY_URL` origin. If contacting an external server, an explicit `accessToken` parameter is required.
