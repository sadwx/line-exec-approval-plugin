import { readFileSync } from "fs";
import type { FlexMessage } from "./flex-builder.js";
import type { LineChannelConfig, OpenClawConfig, PluginConfig, PluginLogger } from "./types.js";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

/**
 * Resolve the LINE channel access token.
 *
 * Resolution order:
 * 1. pluginConfig.channelAccessToken  — inline plaintext value
 * 2. pluginConfig.channelAccessTokenFile — content of the specified file
 * 3. pluginConfig.channelAccessTokenEnv  — value of the specified env var
 * 4. coreConfig.channels.line (accounts.default or top-level) tokenFile / channelAccessToken
 * 5. LINE_CHANNEL_ACCESS_TOKEN environment variable
 */
export function resolveLineToken(
  pluginConfig: PluginConfig | undefined,
  coreConfig: OpenClawConfig,
): string | null {
  // 1. Inline plaintext
  if (pluginConfig?.channelAccessToken) return pluginConfig.channelAccessToken;

  // 2. File path
  if (pluginConfig?.channelAccessTokenFile) {
    return readFileSync(pluginConfig.channelAccessTokenFile, "utf8").trim();
  }

  // 3. Environment variable name
  if (pluginConfig?.channelAccessTokenEnv) {
    return process.env[pluginConfig.channelAccessTokenEnv] ?? null;
  }

  // 4. Inherit from channels.line config
  const lineAccount: LineChannelConfig | undefined =
    (coreConfig.channels?.line?.accounts?.default as LineChannelConfig | undefined) ??
    coreConfig.channels?.line;

  if (lineAccount?.channelAccessToken) return lineAccount.channelAccessToken;
  if (lineAccount?.tokenFile) return readFileSync(lineAccount.tokenFile, "utf8").trim();

  // 5. Fallback env var
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? null;
}

export async function pushFlexMessage(
  token: string,
  userId: string,
  message: FlexMessage,
  logger: PluginLogger,
): Promise<boolean> {
  const res = await fetch(LINE_PUSH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: userId, messages: [message] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error(
      `[line-approval-flex] LINE push failed: ${res.status.toString()} ${body}`,
    );
    return false;
  }

  logger.info(`[line-approval-flex] Flex Message sent to ${userId}`);
  return true;
}
