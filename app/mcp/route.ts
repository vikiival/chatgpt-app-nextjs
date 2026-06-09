import { baseURL } from "@/baseUrl";
import { auth } from "@/lib/auth";
import { withMcpAuth } from "better-auth/plugins";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

const MCP_APPS_MIME_TYPE = "text/html;profile=mcp-app";
const CHATGPT_APPS_MIME_TYPE = "text/html+skybridge";
const OAUTH_SECURITY_SCHEMES = [
  {
    type: "oauth2",
    scopes: ["openid", "profile", "email"],
  },
] as const;

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  if (!result.ok) {
    throw new Error(`Failed to fetch widget HTML for ${path}: ${result.status}`);
  }
  return await result.text();
};

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

function toolMeta(widget: WidgetDefinition) {
  return {
    securitySchemes: OAUTH_SECURITY_SCHEMES,
    ui: {
      resourceUri: widget.templateUri,
      visibility: ["model", "app"],
    },
    "ui/resourceUri": widget.templateUri,
    "openai/outputTemplate": widget.chatGptTemplateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": widget.widgetAccessible ?? true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

function resourceMeta(widget: WidgetDefinition) {
  return {
    ui: {
      csp: {
        connectDomains: [baseURL, baseURL.replace(/^http/, "ws")],
        resourceDomains: [baseURL, "https://*.oaistatic.com"],
        baseUriDomains: [baseURL],
      },
      prefersBorder: widget.prefersBorder ?? false,
    },
    "openai/widgetDescription": widget.description,
    "openai/widgetPrefersBorder": widget.prefersBorder ?? false,
    "openai/widgetDomain": baseURL,
    "openai/widgetCSP": {
      connect_domains: [baseURL, baseURL.replace(/^http/, "ws")],
      resource_domains: [baseURL, "https://*.oaistatic.com"],
    },
  } as const;
}

const sampleWidget: WidgetDefinition = {
  id: "starter-widget",
  title: "Apps SDK Starter Widget",
  templateUri: "ui://widget/starter-widget.html",
  chatGptTemplateUri: "ui://widget/starter-widget.skybridge.html",
  path: "/",
  invoking: "Preparing the starter widget",
  invoked: "Starter widget ready",
  description:
    "Interactive starter widget showing tool output, widget state, display controls, and MCP bridge actions.",
  prefersBorder: false,
  widgetAccessible: true,
};

const mcpHandler = createMcpHandler(async (server) => {
  server.registerResource(
    sampleWidget.id,
    sampleWidget.templateUri,
    {
      title: sampleWidget.title,
      description: sampleWidget.description,
      mimeType: MCP_APPS_MIME_TYPE,
      _meta: resourceMeta(sampleWidget),
    },
    async (uri) => {
      const html = await getAppsSdkCompatibleHtml(baseURL, sampleWidget.path);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: MCP_APPS_MIME_TYPE,
            text: html,
            _meta: resourceMeta(sampleWidget),
          },
        ],
      };
    }
  );

  server.registerResource(
    `${sampleWidget.id}-skybridge`,
    sampleWidget.chatGptTemplateUri,
    {
      title: sampleWidget.title,
      description: sampleWidget.description,
      mimeType: CHATGPT_APPS_MIME_TYPE,
      _meta: resourceMeta(sampleWidget),
    },
    async (uri) => {
      const html = await getAppsSdkCompatibleHtml(baseURL, sampleWidget.path);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: CHATGPT_APPS_MIME_TYPE,
            text: html,
            _meta: resourceMeta(sampleWidget),
          },
        ],
      };
    }
  );

  server.registerTool(
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

  server.registerTool(
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
      _meta: toolMeta(sampleWidget),
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
        _meta: toolMeta(sampleWidget),
      };
    }
  );
});

const handler = withMcpAuth(auth, async (request) => mcpHandler(request));

export const GET = handler;
export const POST = handler;
