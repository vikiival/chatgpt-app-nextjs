import { useCallback } from "react";
import { useHost } from "./host-provider";
import type { DisplayMode } from "./types";

/**
 * Hook to request display mode changes from the host.
 *
 * Works in ChatGPT (via `window.openai.requestDisplayMode`) and in
 * standards-based MCP Apps hosts (via the `ui/request-display-mode` bridge
 * request).
 *
 * @returns A function to request a specific display mode. The host may reject the request.
 *          For mobile, PiP is always coerced to fullscreen.
 *
 * @example
 * ```tsx
 * const requestDisplayMode = useRequestDisplayMode();
 *
 * const handleExpand = async () => {
 *   const { mode } = await requestDisplayMode("fullscreen");
 *   console.log("Granted mode:", mode);
 * };
 * ```
 */
export function useRequestDisplayMode() {
  const { app } = useHost();

  const requestDisplayMode = useCallback(
    async (mode: DisplayMode) => {
      if (typeof window !== "undefined" && window?.openai?.requestDisplayMode) {
        return await window.openai.requestDisplayMode({ mode });
      }
      if (app) {
        const result = await app.requestDisplayMode({ mode });
        return { mode: result.mode as DisplayMode };
      }
      return { mode };
    },
    [app]
  );

  return requestDisplayMode;
}
