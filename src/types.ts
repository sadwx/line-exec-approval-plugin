/**
 * Minimal OpenClaw plugin API type stubs.
 * Full types available via openclaw/plugin-sdk when openclaw is a peer dep.
 */

export interface PluginLogger {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface ServiceRegistration {
  id: string;
  start: () => void | Promise<void>;
  stop: () => void | Promise<void>;
}

export interface OpenClawPluginApi {
  logger: PluginLogger;
  config: OpenClawConfig;
  pluginConfig: PluginConfig | undefined;
  registerService: (service: ServiceRegistration) => void;
  registerHook: (
    events: string | string[],
    handler: (event: unknown) => Promise<void> | void,
  ) => void;
}

export interface OpenClawConfig {
  gateway?: {
    port?: number;
    auth?: {
      mode?: string;
      token?: string;
    };
  };
  channels?: {
    line?: LineChannelConfig;
  };
}

export interface LineChannelConfig {
  channelAccessToken?: string;
  tokenFile?: string;
  accounts?: Record<string, LineAccountConfig>;
}

export interface LineAccountConfig {
  channelAccessToken?: string;
  tokenFile?: string;
}

/**
 * Plugin-specific configuration (from plugins.entries.line-exec-approval-plugin.config)
 *
 * Token resolution order:
 * 1. channelAccessToken  — inline plaintext value
 * 2. channelAccessTokenFile — path to a file containing the token
 * 3. channelAccessTokenEnv  — name of an environment variable containing the token
 * 4. channels.line.channelAccessToken / channels.line.tokenFile (inherited from core config)
 * 5. LINE_CHANNEL_ACCESS_TOKEN environment variable
 */
export interface PluginConfig {
  enabled?: boolean;
  lineUserId?: string;
  /** Inline plaintext channel access token */
  channelAccessToken?: string;
  /** Path to a file containing the channel access token */
  channelAccessTokenFile?: string;
  /** Name of an environment variable containing the channel access token */
  channelAccessTokenEnv?: string;
}

/** The actual command/context details inside an approval request */
export interface ExecApprovalRequestPayload {
  command: string;
  commandArgv?: string[];
  cwd?: string | null;
  host?: string | null;
  security?: string | null;
  ask?: string | null;
  agentId?: string | null;
  sessionKey?: string | null;
  turnSourceChannel?: string | null;
  turnSourceTo?: string | null;
}

/**
 * The WS event payload for exec.approval.requested.
 * The actual command details are nested under `request`.
 */
export interface ExecApprovalRequest {
  id: string;
  request: ExecApprovalRequestPayload;
  createdAtMs: number;
  expiresAtMs: number;
}

/** Gateway WebSocket event frame */
export interface GatewayEventFrame {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
}

/** Gateway response frame */
export interface GatewayResponseFrame {
  type: "res";
  id: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

export type GatewayFrame = GatewayEventFrame | GatewayResponseFrame | { type: string };
