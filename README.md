# line-approval-flex

OpenClaw plugin that delivers exec approval requests to LINE as interactive Flex Message cards with approve/deny buttons.

## How It Works

1. Subscribes to `exec.approval.requested` gateway events via local WebSocket
2. Pushes a LINE Flex Message card to the configured user with three buttons:
   - **✅ Allow Once** — runs the command this time only
   - **⭐ Allow Always** — adds to allowlist and runs
   - **❌ Deny** — blocks the command
3. Tapping a button sends `/approve <id> <decision>` through LINE, which the existing `/approve` command resolves

This plugin works alongside existing approval channels (e.g. Discord buttons). The first channel to resolve wins; the other becomes inactive.

---

## Requirements

- OpenClaw gateway running (tested on v2026.3.8)
- A LINE Messaging API channel with a valid channel access token
- The approver's LINE user ID (starts with `U` followed by 32 hex characters)

---

## Installation

### Option A: Local path (current)

Add to your OpenClaw config (`~/.openclaw/openclaw.json`):

```json
{
  "plugins": {
    "allow": ["line-approval-flex"],
    "load": {
      "paths": ["/path/to/line-approval-flex"]
    },
    "entries": {
      "line-approval-flex": {
        "enabled": true,
        "config": {
          "lineUserId": "U1234567890abcdef1234567890abcdef"
        }
      }
    }
  }
}
```

### Option B: npm (once published)

```bash
openclaw plugins install openclaw-line-approval-flex
```

Then configure under `plugins.entries.line-approval-flex.config`.

---

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `lineUserId` | string | ✅ | LINE user ID of the approver (`U` + 32 hex chars) |
| `channelAccessToken` | string | — | LINE channel access token (inline) |
| `channelAccessTokenFile` | string | — | Path to a file containing the channel access token |
| `enabled` | boolean | — | Set to `false` to disable without removing config (default: `true`) |

### Token resolution order

The plugin resolves the LINE channel access token in this order:

1. `config.channelAccessToken` — explicit inline token
2. `config.channelAccessTokenFile` — path to token file
3. `channels.line.channelAccessToken` or `channels.line.tokenFile` in OpenClaw config — inherited from default LINE channel
4. `LINE_CHANNEL_ACCESS_TOKEN` environment variable

### Full config example

```json
{
  "plugins": {
    "allow": ["line-approval-flex"],
    "load": {
      "paths": ["/home/ubuntu/.openclaw/workspace/line-approval-flex"]
    },
    "entries": {
      "line-approval-flex": {
        "enabled": true,
        "config": {
          "lineUserId": "U1234567890abcdef1234567890abcdef",
          "channelAccessTokenFile": "/home/ubuntu/.openclaw/line-dev-channel-access-token.txt"
        }
      }
    }
  }
}
```

---

## Finding Your LINE User ID

Send any message to your LINE bot, then check the gateway logs:

```bash
openclaw channels logs --channel line
```

Your user ID appears in the session key: `agent:main:line:direct:<userId>`

---

## LINE Push Message Quota

This plugin uses the LINE **push message** API, which is subject to monthly limits:

| Plan | Monthly limit |
|---|---|
| Free | 200 messages |
| Light | 1,000 messages |
| Standard | Unlimited |

**Tip:** Use a dedicated test channel (with its own quota) for development, and the production channel for live use.

---

## Using Multiple LINE Accounts

If you have multiple LINE Messaging API channels configured in OpenClaw (e.g. `default` and `dev`), you can point this plugin to a specific channel's token file:

```json
{
  "config": {
    "lineUserId": "U1234567890abcdef1234567890abcdef",
    "channelAccessTokenFile": "/home/ubuntu/.openclaw/line-dev-channel-access-token.txt"
  }
}
```

---

## Development

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Lint and auto-fix
npm run lint:fix

# Format with Prettier
npm run format

# Build to dist/
npm run build
```

### Project structure

```
src/
  types.ts          — OpenClaw plugin API type stubs
  flex-builder.ts   — LINE Flex Message card builder
  gateway-client.ts — Gateway WebSocket subscriber
  line-sender.ts    — LINE push message API
  index.ts          — Plugin entry point
```

---

## Troubleshooting

**No Flex Message received**
- Check gateway logs: `openclaw channels logs --channel line`
- Verify the approver has added the LINE bot as a friend
- Confirm push quota has not been exhausted (HTTP 429 in logs)

**Gateway auth failed**
- Ensure the gateway is running and the token in `channels.gateway.auth.token` is correct
- Restart the gateway and check logs for `gateway auth OK`

**`(unknown)` shown as command**
- This is normal for sandbox initialization execs — the `command` field is empty in the approval payload
- Real user-triggered execs will show the actual command
