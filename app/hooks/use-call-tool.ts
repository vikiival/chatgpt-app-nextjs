import { useCallback } from "react";
import { useHost } from "./host-provider";
import type { ToolMap, TypedCallToolResponse } from "./types";

/**
 * Hook to call MCP (Model Context Protocol) tools directly from the widget.
 *
 * Works in ChatGPT (via `window.openai.callTool`) and in standards-based
 * MCP Apps hosts (via the `tools/call` bridge request).
 *
 * Tool names are constrained to the tools registered in `app/mcp/route.ts`
 * (see `ToolMap`), and both the arguments and the returned `structuredContent`
 * are inferred from that tool's schema.
 *
 * @returns A function to call a tool by name. Resolves to the (typed) tool
 *          response, or `null` when no host bridge is available.
 *
 * @example
 * ```tsx
 * const callTool = useCallTool();
 *
 * const handleFetchData = async () => {
 *   const result = await callTool("template_echo", { name: "Ada" });
 *   // result?.structuredContent is typed as the template_echo output.
 *   console.log(result?.structuredContent?.message);
 * };
 * ```
 */
export function useCallTool() {
  const { app } = useHost();

  const callTool = useCallback(
    async <K extends keyof ToolMap>(
      name: K,
      args: ToolMap[K]["args"]
    ): Promise<TypedCallToolResponse<ToolMap[K]["structuredContent"]> | null> => {
      type Result = TypedCallToolResponse<ToolMap[K]["structuredContent"]>;
      // The bridge boundary is dynamic (the host returns an untyped payload);
      // narrow it to the tool's declared output rather than a blanket cast.
      if (typeof window !== "undefined" && window?.openai?.callTool) {
        const response = await window.openai.callTool(
          name,
          args as Record<string, unknown>
        );
        return response as Result;
      }
      if (app) {
        const response = await app.callServerTool({
          name,
          arguments: args as Record<string, unknown>,
        });
        return response as unknown as Result;
      }
      return null;
    },
    [app]
  );

  return callTool;
}
