/**
 * Source: https://github.com/openai/openai-apps-sdk-examples/tree/main/src
 */

export type OpenAIGlobals<
  ToolInput = UnknownObject,
  ToolOutput = UnknownObject,
  ToolResponseMetadata = UnknownObject,
  WidgetState = UnknownObject
> = {
  // visuals
  theme: Theme;

  userAgent: UserAgent;
  locale: string;

  // layout
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;

  // state
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
  setWidgetState: (state: WidgetState) => Promise<void>;
};

type API = {
  callTool: CallTool;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal(payload: { href: string }): void;

  // Layout controls
  requestDisplayMode: RequestDisplayMode;
};

export type UnknownObject = Record<string, unknown>;

export type Theme = "light" | "dark";

export type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type SafeArea = {
  insets: SafeAreaInsets;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: {
    hover: boolean;
    touch: boolean;
  };
};

/** Display mode */
export type DisplayMode = "pip" | "inline" | "fullscreen";
export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
  /**
   * The granted display mode. The host may reject the request.
   * For mobile, PiP is always coerced to fullscreen.
   */
  mode: DisplayMode;
}>;

export type CallToolResponse = {
  content?: Array<{ type: string; [key: string]: unknown }>;
  structuredContent?: UnknownObject;
  isError?: boolean;
  result?: string;
  meta?: UnknownObject;
};

/** Calling APIs */
export type CallTool = (
  name: string,
  args: Record<string, unknown>
) => Promise<CallToolResponse>;

/**
 * Hand-maintained map of the MCP tools registered in `app/mcp/route.ts`, kept
 * in sync with the zod input/output schemas there.
 *
 * mcp-handler's `createMcpHandler` returns a plain `(request) => Promise<Response>`
 * and does not surface tool name/schema info in its type (`AppType` from
 * route.ts is that opaque function type), so this map is the source of truth for
 * typing `useCallTool` — tool names are constrained to a union and args /
 * structuredContent are inferred from here.
 */
export type ToolMap = {
  template_echo: {
    args: {
      name?: string;
      mode?: "overview" | "hooks" | "bridge";
    };
    structuredContent: {
      name: string;
      mode: "overview" | "hooks" | "bridge";
      message: string;
      timestamp: string;
    };
  };
  template_update_preferences: {
    args: {
      density?: "comfortable" | "compact";
      showBridgeHints?: boolean;
    };
    structuredContent: {
      preferences: {
        density: "comfortable" | "compact";
        showBridgeHints: boolean;
      };
      updatedAt: string;
    };
  };
};

/** A `CallToolResponse` with `structuredContent` narrowed to a tool's output shape. */
export type TypedCallToolResponse<S extends UnknownObject> = Omit<
  CallToolResponse,
  "structuredContent"
> & {
  structuredContent?: S;
};

/** Extra events */
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAIGlobals>;
}> {
  readonly type = SET_GLOBALS_EVENT_TYPE;
}

/**
 * Global oai object injected by the web sandbox for communicating with chatgpt host page.
 */
declare global {
  interface Window {
    openai: API & OpenAIGlobals;
    innerBaseUrl: string;
    /**
     * Set by `HostProvider` once the MCP Apps `App` connects, so the
     * `layout.tsx` bootstrap click interceptor can route cross-origin links
     * through the host bridge (`ui/open-link`) instead of navigating the iframe.
     */
    __mcpOpenLink?: (href: string) => void;
  }

  interface WindowEventMap {
    [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
  }
}
