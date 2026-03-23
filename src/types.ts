import type { FlexMessage } from "./flex-builder.js";

export type ButtonAction = "command" | "friendly" | "silent";

export interface ExecApprovalRequestPayload {
  command: string;
  commandArgv?: string[];
  sessionKey?: string;
  agentId?: string;
  cwd?: string;
  host?: string;
  [key: string]: unknown;
}

export interface ExecApprovalRequest {
  id: string;
  request: ExecApprovalRequestPayload;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface PluginConfig {
  enabled?: boolean;
  lineUserId?: string;
  lineChannelAccessToken?: string;
  buttonAction?: ButtonAction;
  [key: string]: unknown;
}

export type PluginLogger = Logger;

export interface GatewayAuth {
  mode: string;
  token: string;
}

export interface GatewayConfig {
  auth?: GatewayAuth;
  port?: number;
  [key: string]: unknown;
}

export interface OpenClawConfig {
  gateway?: GatewayConfig;
  channels?: {
    line?: {
      channelAccessToken?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
}

export interface ServiceRegistration {
  id: string;
  start(): void;
  stop(): void;
}

export interface MessageReceivedHookContext {
  from?: string;
  content: string;
  timestamp?: number;
  channelId?: string;
  accountId?: string;
  conversationId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageReceivedHookEvent {
  type?: string;
  action?: string;
  context: MessageReceivedHookContext;
}

export interface GatewayFrame {
  type: string;
  id?: string;
  result?: unknown;
  error?: string;
  [key: string]: unknown;
}

export interface OpenClawPluginApi {
  logger: Logger;
  config: OpenClawConfig;
  pluginConfig: PluginConfig;
  registerService(service: ServiceRegistration): void;
  registerHook(event: string, handler: (event: unknown) => Promise<void> | void): void;
  pushLineMessage(userId: string, messages: FlexMessage[]): Promise<void>;
}
