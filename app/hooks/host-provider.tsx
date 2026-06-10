"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { App, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { UnknownObject } from "./types";

/**
 * Which kind of host the widget is rendering in.
 *
 * - `chatgpt`: ChatGPT Apps SDK (skybridge) sandbox with `window.openai`.
 * - `mcp-app`: A standards-based MCP Apps host (Claude, Goose, VS Code,
 *   ChatGPT in MCP Apps mode, ...) reached through the `ui/*` postMessage
 *   bridge from `@modelcontextprotocol/ext-apps`.
 * - `standalone`: A regular browser tab without any host bridge.
 * - `detecting`: Initial state while the MCP Apps handshake is in flight.
 */
export type HostFlavor = "detecting" | "chatgpt" | "mcp-app" | "standalone";

export type HostBridge = {
  flavor: HostFlavor;
  /** Connected ext-apps `App` instance when flavor is `mcp-app`. */
  app: App | null;
  /** Tool arguments pushed by an MCP Apps host (`ui/notifications/tool-input`). */
  toolInput: UnknownObject | null;
  /** `structuredContent` of the tool result pushed by an MCP Apps host. */
  toolOutput: UnknownObject | null;
  /** Host context (theme, displayMode, dimensions, locale, ...) from `ui/initialize`. */
  hostContext: McpUiHostContext | null;
};

const defaultBridge: HostBridge = {
  flavor: "detecting",
  app: null,
  toolInput: null,
  toolOutput: null,
  hostContext: null,
};

const HostContext = createContext<HostBridge>(defaultBridge);

/** Read the unified host bridge. Safe in every environment. */
export function useHost(): HostBridge {
  return useContext(HostContext);
}

function isChatGptHost(): boolean {
  return typeof window !== "undefined" && typeof window.openai !== "undefined";
}

function isEmbedded(): boolean {
  return typeof window !== "undefined" && window.self !== window.top;
}

// The connection lives at module level so React Strict Mode's double-mount
// never opens two ui/initialize handshakes, and so notification handlers can
// be registered before connect() — data pushed by the host is buffered here
// and replayed into whichever HostProvider is currently mounted.
type McpAppData = Pick<HostBridge, "toolInput" | "toolOutput" | "hostContext">;

let mcpAppData: McpAppData = {
  toolInput: null,
  toolOutput: null,
  hostContext: null,
};
const mcpAppListeners = new Set<() => void>();
let cachedConnection: Promise<App> | null = null;

function updateMcpAppData(patch: Partial<McpAppData>) {
  mcpAppData = { ...mcpAppData, ...patch };
  mcpAppListeners.forEach((listener) => listener());
}

function connectMcpApp(): Promise<App> {
  if (!cachedConnection) {
    cachedConnection = (async () => {
      const app = new App(
        { name: "apps-sdk-starter-widget", version: "0.1.0" },
        {},
        { autoResize: true }
      );

      app.ontoolinput = (params) => {
        updateMcpAppData({
          toolInput: (params.arguments as UnknownObject) ?? null,
        });
      };
      app.ontoolresult = (result) => {
        updateMcpAppData({
          toolOutput: (result.structuredContent as UnknownObject) ?? null,
        });
      };
      app.onhostcontextchanged = (changed) => {
        updateMcpAppData({
          hostContext: { ...mcpAppData.hostContext, ...changed },
        });
      };

      // 10s guard so a host that never answers ui/initialize degrades
      // to standalone instead of hanging in "detecting" forever.
      await app.connect(undefined, { timeout: 10_000 });
      updateMcpAppData({ hostContext: app.getHostContext() ?? null });
      return app;
    })();
    cachedConnection.catch(() => {
      cachedConnection = null;
    });
  }
  return cachedConnection;
}

export function HostProvider({ children }: { children: ReactNode }) {
  const [bridge, setBridge] = useState<HostBridge>(defaultBridge);

  useEffect(() => {
    if (isChatGptHost()) {
      setBridge((prev) => ({ ...prev, flavor: "chatgpt" }));
      return;
    }

    if (!isEmbedded()) {
      setBridge((prev) => ({ ...prev, flavor: "standalone" }));
      return;
    }

    let connectedApp: App | null = null;

    const syncFromMcpApp = () => {
      setBridge((prev) => ({
        ...prev,
        ...mcpAppData,
        ...(connectedApp ? { flavor: "mcp-app" as const, app: connectedApp } : {}),
      }));
    };

    mcpAppListeners.add(syncFromMcpApp);

    connectMcpApp()
      .then((app) => {
        connectedApp = app;
        syncFromMcpApp();
      })
      .catch(() => {
        setBridge((prev) =>
          prev.flavor === "detecting" ? { ...prev, flavor: "standalone" } : prev
        );
      });

    return () => {
      mcpAppListeners.delete(syncFromMcpApp);
    };
  }, []);

  // Mirror the host theme onto <html data-theme> the same way the ChatGPT
  // sandbox does, so CSS (and @openai/apps-sdk-ui) themes both hosts alike.
  useEffect(() => {
    const theme = bridge.hostContext?.theme;
    if (!theme) {
      return;
    }
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [bridge.hostContext?.theme]);

  return <HostContext.Provider value={bridge}>{children}</HostContext.Provider>;
}
