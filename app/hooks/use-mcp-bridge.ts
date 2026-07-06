"use client";

import { useCallback } from "react";
import { useHost } from "./host-provider";
import { useCallTool } from "./use-call-tool";
import { useSendMessage } from "./use-send-message";
import { useOpenExternal } from "./use-open-external";
import { useRequestDisplayMode } from "./use-request-display-mode";

/**
 * Convenience wrapper around the host bridge, composed from the focused,
 * host-aware hooks (`useCallTool`, `useSendMessage`, `useOpenExternal`,
 * `useRequestDisplayMode`) plus the MCP Apps-only `updateModelContext`.
 *
 * Prefer the focused hooks directly. This hook is handy when a component needs
 * several bridge actions at once, or the MCP Apps-only `ui/update-model-context`
 * method.
 */
export function useMcpBridge() {
  const { app } = useHost();
  const callTool = useCallTool();
  const sendMessage = useSendMessage();
  const openLink = useOpenExternal();
  const requestDisplayMode = useRequestDisplayMode();

  // ui/update-model-context has no ChatGPT skybridge equivalent, so it needs
  // the connected MCP Apps App directly.
  const updateModelContext = useCallback(
    (context: string) => {
      if (!app) {
        throw new Error("MCP Apps bridge is not available.");
      }
      return app.updateModelContext({
        content: [{ type: "text", text: context }],
      });
    },
    [app]
  );

  return {
    /** Connected ext-apps App instance, or null outside MCP Apps hosts. */
    app,
    callTool,
    sendMessage,
    openLink,
    requestDisplayMode,
    updateModelContext,
  };
}
