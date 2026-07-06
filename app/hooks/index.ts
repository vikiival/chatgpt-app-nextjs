// Host bridge (ChatGPT skybridge + standards-based MCP Apps hosts)
export { HostProvider, useHost } from "./host-provider";
export type { HostBridge, HostFlavor } from "./host-provider";

// Host API hooks
export { useCallTool } from "./use-call-tool";
export { useSendMessage } from "./use-send-message";
export { useOpenExternal } from "./use-open-external";
export { useRequestDisplayMode } from "./use-request-display-mode";
export { useMcpBridge } from "./use-mcp-bridge";

// OpenAI state hooks
export { useDisplayMode } from "./use-display-mode";
export { useWidgetProps } from "./use-widget-props";
export { useWidgetState } from "./use-widget-state";
export { useOpenAIGlobal } from "./use-openai-global";

// Additional hooks
export { useMaxHeight } from "./use-max-height";
export { useSafeArea } from "./use-safe-area";
export { useIsChatGptApp } from "./use-is-chatgpt-app";

// Teardown registry (for hosts that unmount the widget)
export { registerTeardownCallback } from "./host-provider";

// Types
export type * from "./types";
