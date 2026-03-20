# line-exec-approval-plugin

> OpenClaw plugin — deliver exec approval requests to LINE as interactive Flex Message cards

When OpenClaw asks for permission to run a shell command, this plugin pushes a rich card to LINE with three tap-to-approve buttons. No need to switch to a browser or another app.

![Approval card preview](https://img.shields.io/badge/LINE-Flex%20Approval-00C300?logo=line&logoColor=white)

---

## How It Works

1. Subscribes to `exec.approval.requested` events from the local OpenClaw gateway via WebSocket
2. Pushes a LINE Flex Message card to the configured approver with three buttons:
   - **✅ Allow Once** — approve this command, this time only
   - **⭐ Allow Always** — add to allowlist and approve permanently
   - **❌ Deny** — block the command
3. Tapping a button sends `/approve <id> <decision>` through LINE, which OpenClaw resolves

Works alongside other approval channels (e.g. Discord buttons). The first channel to resolve wins.

---

## Prerequisites

### OpenClaw

- OpenClaw gateway installed and running (tested on **v2026.3.8+**)
- `exec` approvals enabled in your OpenClaw config:

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all"
      }
    }
  }
}
```

### LINE

- A [LINE Developers](https://developers.line.biz/) account
- A **Messaging API channel** with:
  - A valid **channel access token** (long-lived token recommended)
  - Webhook enabled and pointing to your OpenClaw gateway, e.g. `https://your-domain/line/webhook`
- The approver must add the LINE bot as a **friend** before push messages can be received

> **Push quota:** The free plan allows 200 push messages/month per channel. Consider using a dedicated channel for this plugin to keep its quota separate from other bots.

---

## Installation

### Option A: Local path

Clone or download this repo, then add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "allow": ["line-exec-approval-plugin"],
    "load": {
      "paths": ["/path/to/line-exec-approval-plugin"]
    },
    "entries": {
      "line-exec-approval-plugin": {
        "enabled": true,
        "config": {
          "lineUserId": "U1234567890abcdef1234567890abcdef",
          "channelAccessTokenFile": "/path/to/line-channel-access-token.txt"
        }
      }
    }
  }
}
```

Restart the gateway to load the plugin.

### Option B: npm (once published)

```bash
openclaw plugins install openclaw-line-exec-approval-plugin
```

Then add the `plugins.entries` config block above (without `plugins.load.paths`).

---

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `lineUserId` | string | ✅ | LINE user ID of the approver (starts with `U`, 33 chars total) |
| `channelAccessToken` | string | — | Inline plaintext channel access token |
| `channelAccessTokenFile` | string | — | Path to a file containing the channel access token |
| `channelAccessTokenEnv` | string | — | Name of an environment variable containing the channel access token |
| `enabled` | boolean | — | Set to `false` to disable without removing config (default: `true`) |

Exactly one of `channelAccessToken`, `channelAccessTokenFile`, or `channelAccessTokenEnv` should be set. If none are set, the plugin falls back to the LINE channel config in OpenClaw.

### Token resolution order

1. `config.channelAccessToken` — inline plaintext value
2. `config.channelAccessTokenFile` — content of the specified file
3. `config.channelAccessTokenEnv` — value of the named environment variable
4. `channels.line.channelAccessToken` / `channels.line.tokenFile` — inherited from the default LINE channel in OpenClaw config
5. `LINE_CHANNEL_ACCESS_TOKEN` environment variable

### Full config example

```json
{
  "plugins": {
    "allow": ["line-exec-approval-plugin"],
    "load": {
      "paths": ["/home/user/.openclaw/plugins/line-exec-approval-plugin"]
    },
    "entries": {
      "line-exec-approval-plugin": {
        "enabled": true,
        "config": {
          "lineUserId": "U1234567890abcdef1234567890abcdef",
          "channelAccessTokenFile": "/home/user/.openclaw/secrets/line-token.txt"
        }
      }
    }
  }
}
```

---

## Finding Your LINE User ID

Add your bot as a LINE friend, send it any message, then check the gateway logs:

```bash
openclaw channels logs --channel line
```

Your user ID appears in the inbound session key:

```
agent:main:line:direct:<userId>
```

The `<userId>` part (starting with `U`) is what you need.

---

## Using Multiple LINE Channels

If you have multiple Messaging API channels configured in OpenClaw (e.g. `default` and `dev`), point this plugin to a specific channel's token to control which channel's push quota is used:

```json
{
  "config": {
    "lineUserId": "U1234567890abcdef1234567890abcdef",
    "channelAccessTokenFile": "/home/user/.openclaw/secrets/line-dev-token.txt"
  }
}
```

> LINE user IDs are scoped per **provider** (not per channel), so your user ID is the same across all channels under the same provider.

---

## LINE Push Message Quota

| Plan | Monthly push limit |
|---|---|
| Free | 200 messages |
| Light | 1,000 messages |
| Standard | Unlimited |

**Tip:** Create a dedicated LINE Messaging API channel for approval notifications so its quota stays separate from channels used for regular messaging.

---

## Troubleshooting

**No Flex Message received after a command runs**
- Confirm the approver has added the bot as a LINE friend
- Check gateway logs for `LINE push failed` — HTTP 429 means quota is exhausted
- Verify `lineUserId` is correct (run `openclaw channels logs --channel line` and look for the session key)

**`gateway auth OK` not appearing in logs**
- The gateway may not be running — check `openclaw gateway status`
- The gateway auth token may be wrong — verify `channels.gateway.auth.token` in your config

**Buttons do nothing when tapped**
- The LINE channel's webhook must be active and pointing to your gateway
- The webhook URL must be reachable from LINE's servers (Cloudflare Tunnel or similar)

**Command shows as `(unknown)` on the card**
- Normal for sandbox initialization execs where the `command` field is empty
- Real user-triggered exec commands will display correctly

---

## Development

```bash
npm run typecheck    # TypeScript type check
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier
npm run build        # Compile to dist/
```

### Project structure

```
src/
  types.ts           — Plugin config and OpenClaw API type stubs
  flex-builder.ts    — LINE Flex Message card builder
  gateway-client.ts  — Gateway WebSocket subscriber
  line-sender.ts     — LINE push message API + token resolution
  index.ts           — Plugin entry point
```

---

## License

MIT
