// v2 2026-03-23T08:39
import https from "https";
import type { FlexMessage } from "./flex-builder.js";
import type { Logger, OpenClawConfig, PluginConfig } from "./types.js";

export function resolveLineToken(
  pluginCfg: PluginConfig | undefined,
  config: OpenClawConfig,
): string | undefined {
  return (
    pluginCfg?.lineChannelAccessToken ??
    (config?.channels?.line?.channelAccessToken as string | undefined)
  );
}

function linePost(token: string, body: unknown, logger: Logger): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "api.line.me",
        path: "/v2/bot/message/push",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            logger.error(`[line-exec-approval-plugin] LINE API error ${res.statusCode}: ${raw}`);
          }
          resolve();
        });
      },
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

export async function pushFlexMessage(
  token: string,
  userId: string,
  flex: FlexMessage,
  logger: Logger,
): Promise<void> {
  await linePost(token, { to: userId, messages: [flex] }, logger);
}

export async function pushTextMessage(
  token: string,
  userId: string,
  text: string,
  logger: Logger,
): Promise<void> {
  await linePost(token, { to: userId, messages: [{ type: "text", text }] }, logger);
}
