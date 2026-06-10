"use client";

import { useCallback } from "react";
import { useHost } from "./host-provider";

/**
 * Direct access to MCP Apps bridge methods, backed by the official
 * `@modelcontextprotocol/ext-apps` App connection from `HostProvider`.
 *
 * Prefer the focused hooks (`useCallTool`, `useSendMessage`, ...) which also
 * handle the ChatGPT skybridge. This hook is for MCP Apps-only methods such
 * as `ui/update-model-context`.
 */
export function useMcpBridge() {
  const { app } = useHost();

  const requireApp = useCallback(() => {
    if (!app) {
      throw new Error("MCP Apps bridge is not available.");
    }
    return app;
  }, [app]);

  const callTool = useCallback(
    (name: string, arguments_: Record<string, unknown> = {}) =>
      requireApp().callServerTool({ name, arguments: arguments_ }),
    [requireApp]
  );

  const sendMessage = useCallback(
    (message: string) =>
      requireApp().sendMessage({
        role: "user",
        content: [{ type: "text", text: message }],
      }),
    [requireApp]
  );

  const updateModelContext = useCallback(
    (context: string) =>
      requireApp().updateModelContext({
        content: [{ type: "text", text: context }],
      }),
    [requireApp]
  );

  const openLink = useCallback(
    (url: string) => requireApp().openLink({ url }),
    [requireApp]
  );

  const requestDisplayMode = useCallback(
    (mode: "inline" | "fullscreen" | "pip") =>
      requireApp().requestDisplayMode({ mode }),
    [requireApp]
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
