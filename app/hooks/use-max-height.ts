/**
 * Source: https://github.com/openai/openai-apps-sdk-examples/tree/main/src
 */

import { useHost } from "./host-provider";
import { useOpenAIGlobal } from "./use-openai-global";

/**
 * Hook to get the maximum height available for the widget.
 * Useful for responsive layouts that need to adapt to container constraints.
 *
 * Reads `window.openai.maxHeight` in ChatGPT, or the MCP Apps host context
 * `containerDimensions` elsewhere.
 *
 * @returns The maximum height in pixels, or null if not available
 *
 * @example
 * ```tsx
 * const maxHeight = useMaxHeight();
 * const style = { maxHeight: maxHeight ?? "100vh", overflow: "auto" };
 * ```
 */
export function useMaxHeight(): number | null {
  const openaiMaxHeight = useOpenAIGlobal("maxHeight");
  const { hostContext } = useHost();

  if (openaiMaxHeight != null) {
    return openaiMaxHeight;
  }

  const dimensions = hostContext?.containerDimensions as
    | { height?: number; maxHeight?: number }
    | undefined;

  return dimensions?.height ?? dimensions?.maxHeight ?? null;
}
