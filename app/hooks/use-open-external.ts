import { useCallback } from "react";
import { useHost } from "./host-provider";

/**
 * Hook to open external links through the host client.
 * This ensures links open properly in native environments (mobile apps, desktop clients).
 *
 * Works in ChatGPT (via `window.openai.openExternal`), in standards-based
 * MCP Apps hosts (via the `ui/open-link` bridge request), and falls back to
 * `window.open` in a regular browser.
 *
 * @returns A function that opens external URLs in a new tab/window
 *
 * @example
 * ```tsx
 * const openExternal = useOpenExternal();
 *
 * const handleLinkClick = () => {
 *   openExternal("https://example.com");
 * };
 *
 * return <button onClick={handleLinkClick}>Visit Site</button>;
 * ```
 */
export function useOpenExternal() {
  const { app } = useHost();

  const openExternal = useCallback(
    (href: string) => {
      if (typeof window === "undefined") {
        return;
      }

      // Try to use ChatGPT's native link handler
      if (window?.openai?.openExternal) {
        try {
          window.openai.openExternal({ href });
          return;
        } catch (error) {
          console.warn("openExternal failed, falling back", error);
        }
      }

      // MCP Apps hosts handle links through the bridge
      if (app) {
        app.openLink({ url: href }).catch((error) => {
          console.warn("ui/open-link failed, falling back to window.open", error);
          window.open(href, "_blank", "noopener,noreferrer");
        });
        return;
      }

      // Fallback to standard web behavior
      window.open(href, "_blank", "noopener,noreferrer");
    },
    [app]
  );

  return openExternal;
}
