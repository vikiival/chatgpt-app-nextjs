import { baseURL } from "@/baseUrl";
import { createMcpHandler, getPublicOrigin } from "mcp-handler";
import { z } from "zod";

const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  if (!result.ok) {
    throw new Error(`Failed to fetch widget HTML for ${path}: ${result.status}`);
  }
  return await result.text();
};

function normalizeWidgetHtml(html: string, publicOrigin: string) {
  return html
    .replaceAll("https://undefined", publicOrigin)
    .replaceAll("http://undefined", publicOrigin)
    .replaceAll('href="/_next/', `href="${publicOrigin}/_next/`)
    .replaceAll('src="/_next/', `src="${publicOrigin}/_next/`)
    .replaceAll('href="/favicon', `href="${publicOrigin}/favicon`)
    .replace(/<base href="[^"]*"\s*\/?>/, `<base href="${publicOrigin}">`)
    .replace(
      /window\.innerBaseUrl = "[^"]*"/,
      `window.innerBaseUrl = ${JSON.stringify(publicOrigin)}`
    );
}

type WidgetDefinition = {
  id: string;
  title: string;
  templateUri: string;
  path: string;
  invoking: string;
  invoked: string;
  description: string;
  prefersBorder?: boolean;
  widgetAccessible?: boolean;
};

function toolMeta(widget: WidgetDefinition) {
  return {
    "ui/resourceUri": widget.templateUri,
    "ui/visibility": "visible",
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": widget.widgetAccessible ?? true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

function resourceMeta(widget: WidgetDefinition, publicOrigin: string) {
  return {
    "ui/description": widget.description,
    "ui/prefersBorder": widget.prefersBorder ?? false,
    "ui/domain": publicOrigin,
    "ui/csp": {
      connect_domains: [publicOrigin, publicOrigin.replace(/^http/, "ws")],
      resource_domains: [publicOrigin, "https://*.oaistatic.com"],
    },
    "openai/widgetDescription": widget.description,
    "openai/widgetPrefersBorder": widget.prefersBorder ?? false,
    "openai/widgetDomain": publicOrigin,
    "openai/widgetCSP": {
      connect_domains: [publicOrigin, publicOrigin.replace(/^http/, "ws")],
      resource_domains: [publicOrigin, "https://*.oaistatic.com"],
    },
  } as const;
}

const sampleWidget: WidgetDefinition = {
  id: "starter-widget",
  title: "Apps SDK Starter Widget",
  templateUri: "ui://widget/starter-widget.html",
  path: "/",
  invoking: "Preparing the starter widget",
  invoked: "Starter widget ready",
  description:
    "Interactive starter widget showing tool output, widget state, display controls, and MCP bridge actions.",
  prefersBorder: false,
  widgetAccessible: true,
};

function createHandler(publicOrigin: string) {
  const appOrigin = baseURL || publicOrigin;

  return createMcpHandler(async (server) => {
  server.registerResource(
    sampleWidget.id,
    sampleWidget.templateUri,
    {
      title: sampleWidget.title,
      description: sampleWidget.description,
      mimeType: "text/html+skybridge",
      _meta: resourceMeta(sampleWidget, publicOrigin),
    },
    async (uri) => {
      const html = await getAppsSdkCompatibleHtml(appOrigin, sampleWidget.path);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/html+skybridge",
            text: normalizeWidgetHtml(html, publicOrigin),
            _meta: resourceMeta(sampleWidget, publicOrigin),
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
}

function handleRequest(request: Request) {
  const publicOrigin = baseURL || getPublicOrigin(request);
  return createHandler(publicOrigin)(request);
}

export const GET = handleRequest;
export const POST = handleRequest;
