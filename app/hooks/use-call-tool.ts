import { useCallback } from "react";
import { useHost } from "./host-provider";
import type { CallToolResponse } from "./types";

/**
 * Hook to call MCP (Model Context Protocol) tools directly from the widget.
 *
 * Works in ChatGPT (via `window.openai.callTool`) and in standards-based
 * MCP Apps hosts (via the `tools/call` bridge request).
 *
 * @returns A function to call tools with their name and arguments.
 *          Returns the tool response or null if no host bridge is available.
 *
 * @example
 * ```tsx
 * const callTool = useCallTool();
 *
 * const handleFetchData = async () => {
 *   const result = await callTool("search_database", {
 *     query: "user data",
 *     limit: 10
 *   });
 *   console.log(result?.structuredContent);
 * };
 * ```
 */
export function useCallTool() {
  const { app } = useHost();

  const callTool = useCallback(
    async (name: string, args: Record<string, unknown>): Promise<CallToolResponse | null> => {
      if (typeof window !== "undefined" && window?.openai?.callTool) {
        return await window.openai.callTool(name, args);
      }
      if (app) {
        return (await app.callServerTool({
          name,
          arguments: args,
        })) as CallToolResponse;
      }
      return null;
    },
    [app]
  );

  return callTool;
}
