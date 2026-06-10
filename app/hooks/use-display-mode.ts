/**
 * Source: https://github.com/openai/openai-apps-sdk-examples/tree/main/src
 */

import { useHost } from "./host-provider";
import { useOpenAIGlobal } from "./use-openai-global";
import type { DisplayMode } from "./types";

/**
 * Hook to get the current display mode of the widget.
 *
 * Reads `window.openai.displayMode` in ChatGPT, or the MCP Apps host context
 * (`ui/initialize` / `ui/notifications/host-context-changed`) elsewhere.
 *
 * @returns The current display mode ("pip" | "inline" | "fullscreen") or null if not available
 *
 * @example
 * ```tsx
 * const displayMode = useDisplayMode();
 * if (displayMode === "fullscreen") {
 *   // Render full UI
 * }
 * ```
 */
export function useDisplayMode(): DisplayMode | null {
  const openaiDisplayMode = useOpenAIGlobal("displayMode");
  const { hostContext } = useHost();

  return openaiDisplayMode ?? (hostContext?.displayMode as DisplayMode) ?? null;
}
