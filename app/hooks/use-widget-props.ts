/**
 * Source: https://github.com/openai/openai-apps-sdk-examples/tree/main/src
 */

import { useHost } from "./host-provider";
import { useOpenAIGlobal } from "./use-openai-global";

/**
 * Hook to get widget props (tool output) from the host.
 *
 * In ChatGPT this is `window.openai.toolOutput`; in standards-based MCP Apps
 * hosts it is the `structuredContent` of the `ui/notifications/tool-result`
 * notification.
 *
 * @param defaultState - Default value or function to compute it if tool output is not available
 * @returns The tool output props or the default fallback
 *
 * @example
 * ```tsx
 * const props = useWidgetProps({ userId: "123", name: "John" });
 * ```
 */
export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  const openaiToolOutput = useOpenAIGlobal("toolOutput") as T | null;
  const { toolOutput: mcpToolOutput } = useHost();

  const fallback =
    typeof defaultState === "function"
      ? (defaultState as () => T | null)()
      : defaultState ?? null;

  return (openaiToolOutput ?? (mcpToolOutput as T | null) ?? fallback) as T;
}
