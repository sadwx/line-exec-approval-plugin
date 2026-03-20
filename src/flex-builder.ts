import type { ButtonAction, ExecApprovalRequest } from "./types.js";

const MAX_CMD_LENGTH = 80;
const MAX_SESSION_LENGTH = 60;

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export interface FlexMessage {
  type: "flex";
  altText: string;
  contents: FlexBubble;
}

interface FlexBubble {
  type: "bubble";
  size: string;
  header: FlexBox;
  body: FlexBox;
  footer: FlexBox;
}

interface FlexBox {
  type: "box";
  layout: string;
  contents: FlexComponent[];
  backgroundColor?: string;
  paddingAll?: string;
  spacing?: string;
}

type FlexComponent =
  | {
      type: "text";
      text: string;
      weight?: string;
      size?: string;
      color?: string;
      wrap?: boolean;
      margin?: string;
    }
  | { type: "separator"; margin?: string }
  | { type: "button"; style: string; color?: string; height?: string; action: FlexAction };

type FlexAction =
  | { type: "message"; label: string; text: string }
  | { type: "postback"; label: string; data: string; displayText?: string };

function buildAction(
  label: string,
  approveText: string,
  buttonAction: ButtonAction,
): FlexAction {
  if (buttonAction === "command") {
    return { type: "message", label, text: approveText };
  }
  const displayText = buttonAction === "friendly" ? label : undefined;
  return displayText
    ? { type: "postback", label, data: approveText, displayText }
    : { type: "postback", label, data: approveText };
}

export function buildApprovalFlexMessage(
  approval: ExecApprovalRequest,
  buttonAction: ButtonAction = "silent",
): FlexMessage {
  const { id, request } = approval;
  const shortId = id.slice(0, 8);

  const displayCmd = truncate(request.command || "(unknown)", MAX_CMD_LENGTH);
  const displaySession = truncate(
    request.sessionKey ?? request.agentId ?? "unknown",
    MAX_SESSION_LENGTH,
  );

  return {
    type: "flex",
    altText: `⚠️ Exec Approval [${shortId}]\n${displayCmd}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#d9534f",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text: "⚠️ Exec Approval Required",
            weight: "bold",
            size: "md",
            color: "#ffffff",
          },
          { type: "text", text: `ID: ${shortId}`, size: "xs", color: "#dddddd", margin: "xs" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "Command", size: "xs", color: "#888888", weight: "bold" },
          { type: "text", text: displayCmd, size: "sm", wrap: true, margin: "xs" },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "Session",
            size: "xs",
            color: "#888888",
            weight: "bold",
            margin: "md",
          },
          {
            type: "text",
            text: displaySession,
            size: "xs",
            wrap: true,
            margin: "xs",
            color: "#555555",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#5cb85c",
            height: "sm",
            action: buildAction("✅ Allow Once", `/approve ${id} allow-once`, buttonAction),
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: buildAction("⭐ Allow Always", `/approve ${id} allow-always`, buttonAction),
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: buildAction("❌ Deny", `/approve ${id} deny`, buttonAction),
          },
        ],
      },
    },
  };
}
