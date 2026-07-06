"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { UnknownObject } from "./types";
import { useOpenAIGlobal } from "./use-openai-global";

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
  /** Partial tool arguments streamed during a call (`ui/notifications/tool-input-partial`). */
  toolInputPartial: UnknownObject | null;
  /** `structuredContent` of the tool result pushed by an MCP Apps host. */
  toolOutput: UnknownObject | null;
  /** Set when the host cancels the tool call (`ui/notifications/tool-cancelled`). */
  toolCancelled: { reason?: string } | null;
  /** Host context (theme, displayMode, dimensions, locale, ...) from `ui/initialize`. */
  hostContext: McpUiHostContext | null;
};

const defaultBridge: HostBridge = {
  flavor: "detecting",
  app: null,
  toolInput: null,
  toolInputPartial: null,
  toolOutput: null,
  toolCancelled: null,
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

// Drop from ~10s to 3s: an embedded-but-not-MCP iframe should fall back to
// standalone quickly instead of sitting in "detecting".
const CONNECT_TIMEOUT_MS = 3000;

// Teardown-callback registry. Hooks register flush callbacks here; the
// onteardown request handler drains them so state can be flushed before the
// host unmounts the widget.
const teardownCallbacks = new Set<() => void>();

/** Register a callback invoked when the host tears the widget down. Returns an unsubscribe. */
export function registerTeardownCallback(callback: () => void): () => void {
  teardownCallbacks.add(callback);
  return () => {
    teardownCallbacks.delete(callback);
  };
}

// The connection lives at module level so React Strict Mode's double-mount
// never opens two ui/initialize handshakes, and so notification handlers can
// be registered before connect() — data pushed by the host is buffered here
// and replayed into whichever HostProvider is currently mounted.
type McpAppData = Pick<
  HostBridge,
  "toolInput" | "toolInputPartial" | "toolOutput" | "toolCancelled" | "hostContext"
>;

let mcpAppData: McpAppData = {
  toolInput: null,
  toolInputPartial: null,
  toolOutput: null,
  toolCancelled: null,
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

      // Register notification listeners BEFORE connect() so nothing the host
      // pushes during the handshake is missed. addEventListener is the current
      // API; the deprecated on* setters warn when a handler is replaced.
      app.addEventListener("toolinput", (params) => {
        updateMcpAppData({
          toolInput: (params.arguments as UnknownObject) ?? null,
        });
      });
      app.addEventListener("toolinputpartial", (params) => {
        updateMcpAppData({
          toolInputPartial: (params.arguments as UnknownObject) ?? null,
        });
      });
      app.addEventListener("toolresult", (result) => {
        updateMcpAppData({
          toolOutput: (result.structuredContent as UnknownObject) ?? null,
        });
      });
      app.addEventListener("toolcancelled", (params) => {
        updateMcpAppData({ toolCancelled: { reason: params.reason } });
      });
      app.addEventListener("hostcontextchanged", (changed) => {
        updateMcpAppData({
          hostContext: { ...mcpAppData.hostContext, ...changed },
        });
      });

      // onteardown is a request handler (setter, not addEventListener). Flush
      // registered teardown callbacks, then acknowledge with {} so the host
      // does not get a method-not-found error.
      app.onteardown = () => {
        teardownCallbacks.forEach((callback) => {
          try {
            callback();
          } catch {
            // A misbehaving callback must not block teardown ack.
          }
        });
        return {};
      };

      // Timeout so a host that never answers ui/initialize degrades to
      // standalone instead of hanging in "detecting".
      await app.connect(undefined, { timeout: CONNECT_TIMEOUT_MS });
      updateMcpAppData({ hostContext: app.getHostContext() ?? null });
      return app;
    })();
    // Reset the cache on failure (incl. timeout) so a remount retries instead
    // of replaying a rejected promise.
    cachedConnection.catch(() => {
      cachedConnection = null;
    });
  }
  return cachedConnection;
}

export function HostProvider({ children }: { children: ReactNode }) {
  const [bridge, setBridge] = useState<HostBridge>(defaultBridge);
  const chatGptTheme = useOpenAIGlobal("theme");

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
        // Expose the connected host's openLink to the bootstrap click
        // interceptor (layout.tsx) so cross-origin <a> clicks route through the
        // MCP Apps bridge instead of navigating the iframe.
        window.__mcpOpenLink = (href: string) => {
          void app.openLink({ url: href });
        };
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

  // MCP Apps: apply the host's theme, style variables, and fonts via the SDK
  // helpers. This picks up host --color-*/--font-*/radius/shadow variables that
  // the previous hand-rolled data-theme effect ignored entirely.
  useEffect(() => {
    if (bridge.flavor !== "mcp-app" || !bridge.hostContext) {
      return;
    }
    const { theme, styles } = bridge.hostContext;
    if (theme) {
      applyDocumentTheme(theme);
    }
    if (styles?.variables) {
      applyHostStyleVariables(styles.variables);
    }
    if (styles?.css?.fonts) {
      applyHostFonts(styles.css.fonts);
    }
  }, [bridge.flavor, bridge.hostContext]);

  // ChatGPT: mirror window.openai.theme onto <html data-theme> so CSS (and
  // @openai/apps-sdk-ui) theme the skybridge sandbox the same way.
  useEffect(() => {
    if (bridge.flavor !== "chatgpt" || !chatGptTheme) {
      return;
    }
    document.documentElement.setAttribute("data-theme", chatGptTheme);
    document.documentElement.style.colorScheme = chatGptTheme;
  }, [bridge.flavor, chatGptTheme]);

  return <HostContext.Provider value={bridge}>{children}</HostContext.Provider>;
}
