import { createRequire } from "module";
import type {
  ExecApprovalRequestPayload,
  GatewayFrame,
  GatewayResponseFrame,
  OpenClawConfig,
  PluginLogger,
} from "./types.js";

const RECONNECT_DELAY_MS = 10_000;
const CONNECT_REQUEST_ID = "lap-connect";

function resolveGatewayToken(config: OpenClawConfig): string | null {
  const auth = config.gateway?.auth;
  if (auth?.mode === "token" && auth.token) return auth.token;
  return process.env.OPENCLAW_GATEWAY_TOKEN ?? null;
}

function resolveGatewayUrl(config: OpenClawConfig): string {
  const port = config.gateway?.port ?? 18789;
  return `ws://127.0.0.1:${port.toString()}`;
}

function getWebSocketClass(): typeof WebSocket | null {
  if (typeof globalThis.WebSocket !== "undefined") return globalThis.WebSocket;
  try {
    const require = createRequire(import.meta.url);
    return require("ws") as typeof WebSocket;
  } catch {
    return null;
  }
}

export interface GatewaySubscriberOptions {
  getConfig: () => OpenClawConfig;
  logger: PluginLogger;
  onApprovalRequested: (payload: ExecApprovalRequestPayload) => Promise<void>;
}

export function createGatewaySubscriber(opts: GatewaySubscriberOptions) {
  const { getConfig, logger, onApprovalRequested } = opts;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  function scheduleReconnect(): void {
    if (stopped) return;
    reconnectTimer = setTimeout(() => {
      connect();
    }, RECONNECT_DELAY_MS);
  }

  function connect(): void {
    if (stopped) return;

    const config = getConfig();
    const url = resolveGatewayUrl(config);
    const token = resolveGatewayToken(config);

    const WS = getWebSocketClass();
    if (!WS) {
      logger.error("[line-approval-flex] No WebSocket implementation available");
      return;
    }

    try {
      ws = new WS(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[line-approval-flex] WS connect error: ${msg}`);
      scheduleReconnect();
      return;
    }

    ws.addEventListener("open", () => {
      logger.info("[line-approval-flex] WS connected, authenticating...");
      ws?.send(
        JSON.stringify({
          type: "req",
          id: CONNECT_REQUEST_ID,
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: "gateway-client", version: "0.1.0", platform: "linux", mode: "backend" },
            scopes: ["operator.read", "operator.approvals"],
            ...(token ? { auth: { token } } : {}),
          },
        }),
      );
    });

    ws.addEventListener("message", (evt: MessageEvent) => {
      let frame: GatewayFrame;
      try {
        const raw = typeof evt.data === "string" ? evt.data : (evt.data as Buffer).toString();
        frame = JSON.parse(raw) as GatewayFrame;
      } catch {
        return;
      }

      if (frame.type === "res") {
        const res = frame as GatewayResponseFrame;
        if (res.id === CONNECT_REQUEST_ID) {
          if (res.ok) {
            logger.info("[line-approval-flex] gateway auth OK, listening for approvals");
          } else {
            logger.error(`[line-approval-flex] gateway auth FAILED: ${JSON.stringify(res.error)}`);
          }
        }
        return;
      }

      if (frame.type === "event") {
        const evtFrame = frame as { type: "event"; event: string; payload?: unknown };
        if (evtFrame.event === "exec.approval.requested" && evtFrame.payload) {
          const payload = evtFrame.payload as ExecApprovalRequestPayload;
          logger.info(`[line-approval-flex] approval requested: ${payload.id}`);
          onApprovalRequested(payload).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`[line-approval-flex] handler error: ${msg}`);
          });
        }
      }
    });

    ws.addEventListener("close", (evt: CloseEvent) => {
      if (!stopped) {
        logger.warn(
          `[line-approval-flex] WS closed (${evt.code.toString()}); reconnecting in ${String(RECONNECT_DELAY_MS / 1000)}s`,
        );
        scheduleReconnect();
      }
    });

    ws.addEventListener("error", () => {
      // error is always followed by close; reconnect is handled there
    });
  }

  return {
    start(): void {
      stopped = false;
      connect();
    },
    stop(): void {
      stopped = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
    },
  };
}
