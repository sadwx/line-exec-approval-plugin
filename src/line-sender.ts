import { readFileSync } from "fs";
import type { FlexMessage } from "./flex-builder.js";
import type { LineChannelConfig, OpenClawConfig, PluginConfig, PluginLogger } from "./types.js";

const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export function resolveLineToken(
  pluginConfig: PluginConfig | undefined,
  coreConfig: OpenClawConfig,
): string | null {
  // 1. Explicit token in plugin config
  if (pluginConfig?.channelAccessToken) return pluginConfig.channelAccessToken;

  // 2. Token file path in plugin config
  if (pluginConfig?.channelAccessTokenFile) {
    return readFileSync(pluginConfig.channelAccessTokenFile, "utf8").trim();
  }

  // 3. Inherit from channels.line config
  const lineAccount: LineChannelConfig | undefined =
    (coreConfig.channels?.line?.accounts?.default as LineChannelConfig | undefined) ??
    coreConfig.channels?.line;

  if (lineAccount?.channelAccessToken) return lineAccount.channelAccessToken;
  if (lineAccount?.tokenFile) return readFileSync(lineAccount.tokenFile, "utf8").trim();

  // 4. Environment variable
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
    logger.error(`[line-approval-flex] LINE push failed: ${res.status.toString()} ${body}`);
    return false;
  }

  logger.info(`[line-approval-flex] Flex Message sent to ${userId}`);
  return true;
}
