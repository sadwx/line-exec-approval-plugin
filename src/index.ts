/**
 * line-exec-approval-plugin — OpenClaw plugin
 *
 * Listens for exec.approval.requested gateway events and pushes
 * an interactive LINE Flex Message card with Allow Once / Allow Always / Deny buttons.
 *
 * Buttons use LINE "message" actions so tapping sends /approve <id> <decision>
 * through the existing LINE channel → /approve command handler resolves it.
 */

import { buildApprovalFlexMessage } from "./flex-builder.js";
import { createGatewaySubscriber } from "./gateway-client.js";
import { pushFlexMessage, resolveLineToken } from "./line-sender.js";
import type { ButtonAction, ExecApprovalRequest, OpenClawPluginApi } from "./types.js";

export default function lineApprovalFlexPlugin(api: OpenClawPluginApi): void {
  const { logger } = api;

  async function handleApprovalRequested(payload: ExecApprovalRequest): Promise<void> {
    const pluginCfg = api.pluginConfig;

    if (pluginCfg?.enabled === false) return;

    const token = resolveLineToken(pluginCfg, api.config);
    if (!token) {
      logger.warn("[line-exec-approval-plugin] No LINE channel access token found; skipping");
      return;
    }

    const userId = pluginCfg?.lineUserId;
    if (!userId) {
      logger.warn("[line-exec-approval-plugin] No lineUserId configured; skipping");
      return;
    }

    const buttonAction: ButtonAction = pluginCfg.buttonAction ?? "silent";
    const flex = buildApprovalFlexMessage(payload, buttonAction);
    await pushFlexMessage(token, userId, flex, logger);
  }

  const subscriber = createGatewaySubscriber({
    getConfig: () => api.config,
    logger,
    onApprovalRequested: handleApprovalRequested,
  });

  api.registerService({
    id: "line-exec-approval-plugin",
    start(): void {
      logger.info("[line-exec-approval-plugin] service starting");
      subscriber.start();
    },
    stop(): void {
      logger.info("[line-exec-approval-plugin] service stopping");
      subscriber.stop();
    },
  });
}
