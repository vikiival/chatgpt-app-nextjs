import { baseURL } from "@/baseUrl";
import { createMcpHandler } from "mcp-handler";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

// MCP Apps standard MIME type. Exported by the SDK as RESOURCE_MIME_TYPE and
// re-aliased here so the intent stays obvious at each call site.
const MCP_APPS_MIME_TYPE = RESOURCE_MIME_TYPE; // "text/html;profile=mcp-app"
const CHATGPT_APPS_MIME_TYPE = "text/html+skybridge";

// Memoize widget HTML fetches so concurrent resources/read calls share one
// upstream request. Rejections are evicted (see below) so a transient failure
// doesn't get cached forever.
const htmlCache = new Map<string, Promise<string>>();

const getAppsSdkCompatibleHtml = (baseUrl: string, path: string): Promise<string> => {
  const url = `${baseUrl}${path}`;
  let pending = htmlCache.get(url);
  if (!pending) {
    pending = (async () => {
      const result = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!result.ok) {
        // Include the resolved base URL + full URL for diagnosability — a wrong
        // APP_URL/deploy origin is the most common cause of a failed read.
        throw new Error(
          `Failed to fetch widget HTML for ${path} from baseURL="${baseUrl}" (resolved ${url}): ${result.status}`
        );
      }
      return await result.text();
    })();
    // Evict on failure so the next resources/read retries instead of replaying
    // a cached rejection.
    pending.catch(() => {
      htmlCache.delete(url);
    });
    htmlCache.set(url, pending);
  }
  return pending;
};

// Single source of truth for the widget Content Security Policy. Both the MCP
// Apps `ui.csp` (camelCase, supports `baseUriDomains`) and the ChatGPT
// `openai/widgetCSP` (snake_case) are derived from this constant in
// resourceMeta(). ChatGPT has no `baseUriDomains` equivalent, so that field is
// dropped from the OpenAI shape.
const WIDGET_CSP = {
  connectDomains: [baseURL, baseURL.replace(/^http/, "ws")],
  resourceDomains: [baseURL, "https://*.oaistatic.com"],
  baseUriDomains: [baseURL],
} as const;

type WidgetDefinition = {
  id: string;
  title: string;
  templateUri: string;
  chatGptTemplateUri: string;
  path: string;
  invoking: string;
  invoked: string;
  description: string;
  prefersBorder?: boolean;
  widgetAccessible?: boolean;
};

/** Derive both resource URIs (MCP Apps + ChatGPT skybridge) from a widget id. */
function widgetUris(id: string) {
  return {
    templateUri: `ui://widget/${id}.html`,
    chatGptTemplateUri: `ui://widget/${id}.skybridge.html`,
  };
}

type ToolVisibility = Array<"model" | "app">;

function toolMeta(
  widget: WidgetDefinition,
  overrides?: { visibility?: ToolVisibility }
) {
  // Default: visible to both the model and the app. `template_update_preferences`
  // overrides this to ["app"] so the model does not call a widget-only tool on
  // MCP Apps hosts. ChatGPT has no model-hide `_meta` key, so it stays
  // model-visible there (documented in README).
  const visibility: ToolVisibility = overrides?.visibility ?? ["model", "app"];
  return {
    ui: {
      resourceUri: widget.templateUri,
      visibility,
    },
    // Deprecated flat key kept as a migration aid; registerAppTool keeps the
    // nested `ui.resourceUri` and this flat value in sync automatically.
    "ui/resourceUri": widget.templateUri,
    "openai/outputTemplate": widget.chatGptTemplateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": widget.widgetAccessible ?? true,
    "openai/resultCanProduceWidget": true,
  };
}

function resourceMeta(widget: WidgetDefinition) {
  return {
    ui: {
      csp: {
        connectDomains: [...WIDGET_CSP.connectDomains],
        resourceDomains: [...WIDGET_CSP.resourceDomains],
        baseUriDomains: [...WIDGET_CSP.baseUriDomains],
      },
      prefersBorder: widget.prefersBorder ?? false,
      // `ui.domain` is intentionally omitted. The SDK recommends a stable
      // `domain` for CORS-allowlisting on Claude-style hosts, but some hosts
      // reject arbitrary app domains here and the app origin already lives in
      // the CSP allowlists and `openai/widgetDomain`. Easy to opt in later by
      // adding `domain: baseURL`. See README ("MCP Apps Support").
    },
    "openai/widgetDescription": widget.description,
    "openai/widgetPrefersBorder": widget.prefersBorder ?? false,
    "openai/widgetDomain": baseURL,
    "openai/widgetCSP": {
      // ChatGPT snake_case CSP — no baseUriDomains equivalent.
      connect_domains: [...WIDGET_CSP.connectDomains],
      resource_domains: [...WIDGET_CSP.resourceDomains],
    },
  };
}

const sampleWidget: WidgetDefinition = {
  id: "starter-widget",
  ...widgetUris("starter-widget"),
  title: "Apps SDK Starter Widget",
  path: "/",
  invoking: "Preparing the starter widget",
  invoked: "Starter widget ready",
  description:
    "Interactive starter widget showing tool output, widget state, display controls, and MCP bridge actions.",
  prefersBorder: false,
  widgetAccessible: true,
};

// Registry of every widget in the template. One loop below registers both the
// MCP Apps and the ChatGPT skybridge resource for each entry.
const WIDGET_DEFINITIONS: WidgetDefinition[] = [sampleWidget];

const handler = createMcpHandler(async (server) => {
  for (const widget of WIDGET_DEFINITIONS) {
    // MCP Apps resource — registerAppResource defaults the MIME type to
    // RESOURCE_MIME_TYPE ("text/html;profile=mcp-app") and normalizes _meta.ui.
    registerAppResource(
      server,
      widget.id,
      widget.templateUri,
      {
        title: widget.title,
        description: widget.description,
        _meta: resourceMeta(widget),
      },
      async (uri) => {
        const html = await getAppsSdkCompatibleHtml(baseURL, widget.path);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: MCP_APPS_MIME_TYPE,
              text: html,
              // Per spec the read-callback _meta wins over registration _meta;
              // both come from the single resourceMeta() source so they match.
              _meta: resourceMeta(widget),
            },
          ],
        };
      }
    );

    // ChatGPT skybridge resource. Registered with raw server.registerResource
    // on purpose: registerAppResource emits the MCP Apps MIME type, but ChatGPT
    // needs "text/html+skybridge". Do not "clean this up" into the helper.
    server.registerResource(
      `${widget.id}-skybridge`,
      widget.chatGptTemplateUri,
      {
        title: widget.title,
        description: widget.description,
        mimeType: CHATGPT_APPS_MIME_TYPE,
        _meta: resourceMeta(widget),
      },
      async (uri) => {
        const html = await getAppsSdkCompatibleHtml(baseURL, widget.path);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: CHATGPT_APPS_MIME_TYPE,
              text: html,
              _meta: resourceMeta(widget),
            },
          ],
        };
      }
    );
  }

  registerAppTool(
    server,
    "template_echo",
    {
      title: "Show starter widget",
      description:
        "Render the starter widget with a personalized message and a selected example mode.",
      inputSchema: {
        name: z
          .string()
          .default("Builder")
          .describe("Name to display in the starter widget."),
        mode: z
          .enum(["overview", "hooks", "bridge"])
          .default("overview")
          .describe("Starter section to highlight in the widget."),
      },
      outputSchema: {
        name: z.string(),
        mode: z.enum(["overview", "hooks", "bridge"]),
        message: z.string(),
        timestamp: z.string(),
      },
      _meta: toolMeta(sampleWidget),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    },
    async ({ name, mode }) => {
      return {
        content: [
          {
            type: "text",
            text: `Opened the Apps SDK starter widget for ${name}.`,
          },
        ],
        structuredContent: {
          name,
          mode,
          message:
            "This structured content is available to the iframe through the Apps SDK bridge.",
          timestamp: new Date().toISOString(),
        },
        _meta: toolMeta(sampleWidget),
      };
    }
  );

  registerAppTool(
    server,
    "template_update_preferences",
    {
      title: "Update starter preferences",
      description:
        "Example widget-callable tool that returns updated starter preferences.",
      inputSchema: {
        density: z
          .enum(["comfortable", "compact"])
          .default("comfortable")
          .describe("Preferred widget density."),
        showBridgeHints: z
          .boolean()
          .default(true)
          .describe("Whether to show MCP bridge hints in the widget."),
      },
      outputSchema: {
        preferences: z.object({
          density: z.enum(["comfortable", "compact"]),
          showBridgeHints: z.boolean(),
        }),
        updatedAt: z.string(),
      },
      // Widget-called tool: hidden from the model on MCP Apps hosts via
      // visibility: ["app"], but still widget-accessible.
      _meta: toolMeta(sampleWidget, { visibility: ["app"] }),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: false,
      },
    },
    async ({ density, showBridgeHints }) => {
      return {
        content: [
          {
            type: "text",
            text: `Updated starter preferences to ${density}.`,
          },
        ],
        structuredContent: {
          preferences: {
            density,
            showBridgeHints,
          },
          updatedAt: new Date().toISOString(),
        },
        _meta: toolMeta(sampleWidget, { visibility: ["app"] }),
      };
    }
  );
});

/**
 * Type of the MCP route handler. mcp-handler's `createMcpHandler` returns a
 * plain `(request) => Promise<Response>` and does not surface tool name/schema
 * info, so client-side typing of tool calls uses the hand-maintained `ToolMap`
 * in `app/hooks/types.ts` (kept in sync with the zod schemas above).
 */
export type AppType = typeof handler;

export const GET = handler;
export const POST = handler;
