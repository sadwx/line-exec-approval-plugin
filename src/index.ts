/**
 * line-approval-flex — OpenClaw plugin
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
import type { ExecApprovalRequestPayload, OpenClawPluginApi } from "./types.js";

export default function lineApprovalFlexPlugin(api: OpenClawPluginApi): void {
  const { logger } = api;

  async function handleApprovalRequested(payload: ExecApprovalRequestPayload): Promise<void> {
    const pluginCfg = api.pluginConfig;

    if (pluginCfg?.enabled === false) return;

    const token = resolveLineToken(pluginCfg, api.config);
    if (!token) {
      logger.warn("[line-approval-flex] No LINE channel access token found; skipping");
      return;
    }

    const userId = pluginCfg?.lineUserId;
    if (!userId) {
      logger.warn("[line-approval-flex] No lineUserId configured; skipping");
      return;
    }

    const flex = buildApprovalFlexMessage(payload);
    await pushFlexMessage(token, userId, flex, logger);
  }

  const subscriber = createGatewaySubscriber({
    getConfig: () => api.config,
    logger,
    onApprovalRequested: handleApprovalRequested,
  });

  api.registerService({
    id: "line-approval-flex",
    start(): void {
      logger.info("[line-approval-flex] service starting");
      subscriber.start();
    },
    stop(): void {
      logger.info("[line-approval-flex] service stopping");
      subscriber.stop();
    },
  });
}
