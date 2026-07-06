import { useEffect } from "react";
import { useHost } from "./host-provider";
import { useOpenAIGlobal } from "./use-openai-global";
import type { SafeAreaInsets } from "./types";

const ZERO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Hook to read the host's safe-area insets and expose them as CSS variables.
 *
 * Reads `window.openai.safeArea.insets` in ChatGPT, or the MCP Apps host
 * context `safeAreaInsets` elsewhere. Missing values default to zero.
 *
 * As a side effect, it writes `--safe-area-inset-{top,right,bottom,left}` (in
 * pixels) onto `document.documentElement`, so layout can also consume them from
 * CSS: `padding-top: var(--safe-area-inset-top);`.
 *
 * @returns The resolved safe-area insets in pixels.
 *
 * @example
 * ```tsx
 * const { top } = useSafeArea();
 * return <div style={{ paddingTop: top }}>...</div>;
 * ```
 */
export function useSafeArea(): SafeAreaInsets {
  const openaiSafeArea = useOpenAIGlobal("safeArea");
  const { hostContext } = useHost();

  const source = openaiSafeArea?.insets ?? hostContext?.safeAreaInsets ?? null;
  const insets: SafeAreaInsets = source
    ? {
        top: source.top ?? 0,
        right: source.right ?? 0,
        bottom: source.bottom ?? 0,
        left: source.left ?? 0,
      }
    : ZERO_INSETS;

  const { top, right, bottom, left } = insets;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.style.setProperty("--safe-area-inset-top", `${top}px`);
    root.style.setProperty("--safe-area-inset-right", `${right}px`);
    root.style.setProperty("--safe-area-inset-bottom", `${bottom}px`);
    root.style.setProperty("--safe-area-inset-left", `${left}px`);
  }, [top, right, bottom, left]);

  return insets;
}
