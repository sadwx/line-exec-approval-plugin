import { buildApprovalFlexMessage } from "./flex-builder.js";
import { createGatewaySubscriber } from "./gateway-client.js";
import { pushFlexMessage, pushTextMessage, resolveLineToken } from "./line-sender.js";
import type {
  ButtonAction,
  ExecApprovalRequest,
  MessageReceivedHookEvent,
  OpenClawPluginApi,
} from "./types.js";

const pendingApprovals = new Map<string, ExecApprovalRequest>();

export default function lineExecApprovalPlugin(api: OpenClawPluginApi): void {
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

    pendingApprovals.set(payload.id, payload);

    const buttonAction: ButtonAction = pluginCfg.buttonAction ?? "silent";
    const flex = buildApprovalFlexMessage(payload, buttonAction);
    await pushFlexMessage(token, userId, flex, logger);
  }

  api.registerHook("message:received", async (event: unknown) => {
    const e = event as MessageReceivedHookEvent;
    const content = e.context.content.trim();

    if (!content.startsWith("approval-detail:")) return;

    const id = content.slice("approval-detail:".length).trim();
    const approval = pendingApprovals.get(id);
    if (!approval) return;

    const pluginCfg = api.pluginConfig;
    const token = resolveLineToken(pluginCfg, api.config);
    const userId = pluginCfg?.lineUserId;
    if (!token || !userId) return;

    const { request } = approval;
    const fullCommand =
      request.commandArgv && request.commandArgv.length > 0
        ? request.commandArgv.join(" ")
        : request.command;

    const lines = [
      `📋 Full Command [${id.slice(0, 8)}]`,
      "",
      fullCommand,
      "",
      request.cwd ? `📁 ${request.cwd}` : null,
      request.host ? `🖥 host: ${request.host}` : null,
    ]
      .filter((l): l is string => l !== null)
      .join("\n");

    await pushTextMessage(token, userId, lines, logger);
  });

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
      pendingApprovals.clear();
      subscriber.stop();
    },
  });
}
