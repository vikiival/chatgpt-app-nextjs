"use client";

import { useCallback } from "react";

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type BridgeMethod = "tools/call" | "ui/message" | "ui/update-model-context";

function postBridgeRequest<T>(
  method: BridgeMethod,
  params: Record<string, unknown>
): Promise<T> {
  if (typeof window === "undefined" || !window.parent) {
    return Promise.reject(new Error("MCP Apps bridge is not available."));
  }

  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error(`Bridge request timed out: ${method}`));
    }, 10_000);

    const handleMessage = (event: MessageEvent<JsonRpcResponse<T>>) => {
      if (event.data?.jsonrpc !== "2.0" || event.data.id !== id) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);

      if (event.data.error) {
        reject(new Error(event.data.error.message));
        return;
      }

      resolve(event.data.result as T);
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
  });
}

export function useMcpBridge() {
  const callTool = useCallback(
    <T = unknown>(name: string, arguments_: Record<string, unknown> = {}) =>
      postBridgeRequest<T>("tools/call", { name, arguments: arguments_ }),
    []
  );

  const sendMessage = useCallback(
    (message: string) => postBridgeRequest<void>("ui/message", { message }),
    []
  );

  const updateModelContext = useCallback(
    (context: string) =>
      postBridgeRequest<void>("ui/update-model-context", { context }),
    []
  );

  return { callTool, sendMessage, updateModelContext };
}
