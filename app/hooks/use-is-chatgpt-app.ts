import { useHost } from "./host-provider";

/**
 * Whether the widget is running inside the ChatGPT Apps SDK (skybridge) sandbox.
 *
 * Derived from the unified host bridge so it stays in sync with the detected
 * flavor. (The previous `useSyncExternalStore` implementation subscribed with a
 * permanent no-op and never updated after mount.)
 */
export function useIsChatGptApp(): boolean {
  return useHost().flavor === "chatgpt";
}
