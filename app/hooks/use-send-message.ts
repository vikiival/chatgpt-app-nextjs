import { useCallback } from "react";
import { useHost } from "./host-provider";

/**
 * Hook to send follow-up messages into the host conversation.
 *
 * Works in ChatGPT (via `window.openai.sendFollowUpMessage`) and in
 * standards-based MCP Apps hosts (via the `ui/message` bridge request).
 *
 * @returns A function that sends a message prompt to the host
 *
 * @example
 * ```tsx
 * const sendMessage = useSendMessage();
 *
 * const handleAction = async () => {
 *   await sendMessage("Tell me more about this topic");
 * };
 * ```
 */
export function useSendMessage() {
  const { app } = useHost();

  const sendMessage = useCallback(
    (prompt: string): Promise<void> => {
      if (typeof window !== "undefined" && window?.openai?.sendFollowUpMessage) {
        return window.openai.sendFollowUpMessage({ prompt });
      }
      if (app) {
        return app
          .sendMessage({
            role: "user",
            content: [{ type: "text", text: prompt }],
          })
          .then(() => undefined);
      }
      return Promise.resolve();
    },
    [app]
  );

  return sendMessage;
}
