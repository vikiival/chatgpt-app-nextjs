# ChatGPT Apps SDK Next.js Starter

A compact starter for building ChatGPT apps with Next.js, MCP tools, iframe widgets, and [`@openai/apps-sdk-ui`](https://github.com/openai/apps-sdk-ui).

The template keeps the app generic: no auth, database, billing, or product-specific integrations. It gives you the reusable pieces needed for a production app shell:

- A Next.js app that can render as a normal web page or inside ChatGPT.
- An MCP endpoint at `/mcp`.
- Widget resources served as `text/html+skybridge` for ChatGPT Apps SDK compatibility.
- MCP Apps style UI metadata plus OpenAI compatibility metadata.
- React hooks for `window.openai` globals and actions.
- A small JSON-RPC bridge helper for MCP Apps methods such as `tools/call`, `ui/message`, and `ui/update-model-context`.
- A sample widget built with `@openai/apps-sdk-ui`.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The MCP server is available at:

```text
http://localhost:3000/mcp
```

## Project Structure

```text
app/
  mcp/route.ts          MCP server, tool registration, widget resource registration
  hooks/                Apps SDK and MCP Apps bridge hooks
  page.tsx              Sample widget UI
  custom-page/page.tsx  Navigation example
  layout.tsx            Apps SDK UI provider and iframe bootstrap
  globals.css           Tailwind and Apps SDK UI CSS
baseUrl.ts              App origin detection for local and Vercel deploys
next.config.ts          Asset prefix for iframe-safe Next.js assets
proxy.ts                CORS headers for iframe/RSC fetches
```

## How It Works

1. ChatGPT connects to `/mcp`.
2. The MCP server registers widget resources and tools.
3. A tool, such as `template_echo`, returns `structuredContent` and metadata pointing to `ui://widget/starter-widget.html`.
4. ChatGPT fetches the widget resource and renders it in an iframe.
5. The Next.js app hydrates inside the iframe and reads host state through `window.openai`.

Widget resources use:

```ts
mimeType: "text/html+skybridge"
```

That MIME type is intentionally kept for ChatGPT Apps SDK compatibility. The template also emits MCP Apps style metadata such as `ui/resourceUri`, `ui/visibility`, `ui/domain`, and `ui/csp` so newer MCP Apps hosts have the same intent available.

## UI Components

The app imports the UI kit globally in `app/globals.css`:

```css
@import "@openai/apps-sdk-ui/css";
@source "../node_modules/@openai/apps-sdk-ui";
```

`app/layout.tsx` wraps the app with `AppsSDKUIProvider`, configured to use Next.js `Link`.

Use components directly:

```tsx
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Select } from "@openai/apps-sdk-ui/components/Select";
```

## Customizing Tools And Widgets

Start in `app/mcp/route.ts`.

- Add a widget definition with a stable `templateUri`, for example `ui://widget/orders.html`.
- Register a resource that fetches the matching Next.js route.
- Register one or more tools that return `structuredContent`.
- Point each tool to the widget with both `ui/resourceUri` and `openai/outputTemplate`.

Keep tool outputs structured. The widget can read them through `useWidgetProps`.

## Connecting To ChatGPT

1. Deploy the app to a public HTTPS URL, for example Vercel.
2. In ChatGPT, enable Developer Mode for apps.
3. Create an app and set the MCP server URL to `https://your-domain.example/mcp`.
4. Call `template_echo` to render the starter widget.

`baseUrl.ts` derives the correct app origin in local development and Vercel deployments. For other hosts, set one of these environment variables to your public HTTPS origin:

```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
# or
APP_URL=https://your-domain.example
```

The MCP resource handler also normalizes fetched widget HTML against the public request origin so ChatGPT receives absolute `/_next` stylesheet and script URLs. This prevents unstyled iframe renders when build-time hosting variables are missing.

## Verification

```bash
pnpm tsc --noEmit
pnpm run build
```

The sample UI also renders outside ChatGPT. Bridge actions gracefully report that the host bridge is unavailable when run in a normal browser.
