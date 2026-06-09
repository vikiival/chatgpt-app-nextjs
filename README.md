# ChatGPT Apps SDK Next.js Starter

A compact starter for building ChatGPT apps with Next.js, MCP tools, iframe widgets, and [`@openai/apps-sdk-ui`](https://github.com/openai/apps-sdk-ui).

This template is intentionally generic. It does not include auth, database, billing, or product-specific integrations. It focuses on the reusable foundation every ChatGPT app needs:

- A Next.js app that can render in a normal browser and inside ChatGPT.
- An MCP endpoint at `/mcp`.
- MCP tools that return `content`, `structuredContent`, and widget metadata.
- Widget resources served as `text/html;profile=mcp-app` for MCP Apps hosts.
- A parallel `text/html+skybridge` resource for ChatGPT Apps SDK compatibility.
- MCP Apps metadata plus OpenAI Apps SDK compatibility metadata.
- React hooks for `window.openai` host globals and actions.
- A small JSON-RPC bridge helper for MCP Apps methods.
- A sample widget built with `@openai/apps-sdk-ui`.

## Quick Start

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

The MCP server is available at:

```text
http://localhost:3000/mcp
```

## Scripts

```bash
pnpm dev          # Start local Next.js development server
pnpm run build   # Build the production app
pnpm start       # Start the production server after building
pnpm tsc --noEmit
```

## Project Structure

```text
app/
  apps-sdk-ui-provider.tsx  Client wrapper for AppsSDKUIProvider
  custom-page/page.tsx      Route/navigation example
  globals.css               Tailwind and Apps SDK UI CSS imports
  hooks/                    ChatGPT Apps SDK and MCP Apps bridge hooks
  layout.tsx                Root layout and iframe bootstrap
  mcp/route.ts              MCP server, widget resource, and tool registration
  page.tsx                  Main sample widget UI
baseUrl.ts                  App origin detection for local and Vercel deploys
next.config.ts              Asset prefix for iframe-safe Next.js assets
proxy.ts                    CORS headers for iframe/RSC requests
```

## Architecture

The app has two halves:

- **MCP server**: `app/mcp/route.ts` registers resources and tools. ChatGPT connects to this endpoint.
- **Widget UI**: `app/page.tsx` is a normal Next.js route that is also returned as an MCP widget resource.

The flow is:

1. ChatGPT connects to `/mcp`.
2. The MCP server registers `ui://widget/starter-widget.html`.
3. ChatGPT calls a tool such as `template_echo`.
4. The tool returns `structuredContent` and metadata pointing to the widget resource.
5. ChatGPT fetches the widget HTML and renders it in an iframe.
6. The React widget reads tool output, display state, and host actions through the Apps SDK bridge.

## MCP Apps Support

MCP Apps use a two-part registration:

1. A tool declares a UI resource in `_meta.ui.resourceUri`.
2. A `ui://` resource returns HTML with the MCP Apps MIME type.

The standard MCP Apps resource in this template is:

```ts
{
  uri: "ui://widget/starter-widget.html",
  mimeType: "text/html;profile=mcp-app"
}
```

Tools point to it with nested MCP Apps metadata:

```ts
_meta: {
  ui: {
    resourceUri: "ui://widget/starter-widget.html",
    visibility: ["model", "app"],
  },
}
```

The template keeps the deprecated flat `ui/resourceUri` value as a migration aid, but new hosts should use `_meta.ui.resourceUri`.

## ChatGPT Apps SDK Compatibility

ChatGPT Apps SDK compatibility is kept through a parallel Skybridge resource:

```ts
{
  uri: "ui://widget/starter-widget.skybridge.html",
  mimeType: "text/html+skybridge"
}
```

The same tool metadata also includes OpenAI compatibility fields:

```ts
"openai/outputTemplate": "ui://widget/starter-widget.skybridge.html"
"openai/toolInvocation/invoking": "Preparing the starter widget"
"openai/toolInvocation/invoked": "Starter widget ready"
"openai/widgetAccessible": true
```

This lets MCP Apps hosts render the standards-based resource while ChatGPT Apps SDK hosts can continue using the Skybridge resource.

## Registered MCP Tools

### `template_echo`

Renders the sample widget with structured content.

Input:

```ts
{
  name?: string;
  mode?: "overview" | "hooks" | "bridge";
}
```

Output:

```ts
{
  name: string;
  mode: "overview" | "hooks" | "bridge";
  message: string;
  timestamp: string;
}
```

This is the primary example tool. It demonstrates how a tool can return data that the iframe reads through `useWidgetProps`.

### `template_update_preferences`

Demonstrates a widget-callable MCP tool.

Input:

```ts
{
  density?: "comfortable" | "compact";
  showBridgeHints?: boolean;
}
```

Output:

```ts
{
  preferences: {
    density: "comfortable" | "compact";
    showBridgeHints: boolean;
  };
  updatedAt: string;
}
```

The sample UI calls this from the **Call sample tool** button.

## UI Kit Setup

The app imports the Apps SDK UI styles in `app/globals.css`:

```css
@import "@openai/apps-sdk-ui/css";
@source "../node_modules/@openai/apps-sdk-ui";
```

The root layout wraps the app with `AppsSDKUIProvider` through `app/apps-sdk-ui-provider.tsx`, so package components work with Next.js routing.

Example imports:

```tsx
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Select } from "@openai/apps-sdk-ui/components/Select";
```

## Sample Widget Controls

The visible UI in `app/page.tsx` is a demo of common Apps SDK host interactions.

### Fullscreen Button

The icon button in the top-right asks ChatGPT to render the widget in fullscreen:

```ts
requestDisplayMode("fullscreen")
```

If the widget is already fullscreen, the button is hidden.

### Name Input

The **Name** input updates local React state.

It does not call an MCP tool by itself. The current name is used by the **Update context** button when it sends context to the host.

### Mode Select

The **Mode** select lets you choose:

- `Overview`
- `Hooks`
- `Bridge`

Changing it updates local state and persists the selected mode through widget state:

```ts
setWidgetState({
  notes,
  localMode: nextMode,
})
```

The selected mode is used by **Send follow-up** and **Update context**.

### Call Sample Tool

The **Call sample tool** button calls another MCP tool from inside the widget:

```ts
window.openai.callTool("template_update_preferences", {
  density: "compact",
  showBridgeHints: true,
})
```

It demonstrates widget-to-tool workflows. After the call, the widget updates the **Last action** line.

### Send Follow-Up

The **Send follow-up** button sends a message into the ChatGPT conversation:

```ts
window.openai.sendFollowUpMessage({
  prompt: `Show me how to customize ${mode} mode.`
})
```

This behaves like the user typed a follow-up prompt.

### Update Context

The **Update context** button sends model context through the MCP Apps bridge:

```ts
{
  method: "ui/update-model-context",
  params: {
    content: [{ type: "text", text: "..." }]
  }
}
```

The demo sends:

```text
The starter widget is showing {mode} mode for {name}.
```

This is useful when the model should know about UI state without requiring a user message.

### Widget State Textarea

The **Widget state** textarea persists notes through:

```ts
window.openai.setWidgetState(...)
```

When the host bridge is available, widget state can survive widget lifecycle changes. Outside ChatGPT, the app still renders normally, but host persistence is unavailable.

### Open Route Example

The **Open route example** button navigates to `/custom-page`.

This demonstrates that Next.js routing can work inside the widget iframe when the bootstrap and asset configuration are set correctly.

### Open Docs

The **Open docs** button opens:

```text
https://developers.openai.com/apps-sdk
```

It uses `window.openai.openExternal` when available so ChatGPT can handle external navigation correctly.

## Hooks

The template exposes hooks from `app/hooks`.

Common hooks:

- `useWidgetProps` reads tool `structuredContent` from the host.
- `useWidgetState` reads and writes host-persisted widget state.
- `useDisplayMode` reads whether the widget is inline, fullscreen, or PiP.
- `useRequestDisplayMode` asks the host to change display mode.
- `useCallTool` calls MCP tools from the widget through `window.openai.callTool`.
- `useSendMessage` sends follow-up messages into the ChatGPT conversation.
- `useOpenExternal` opens external URLs through the ChatGPT host.
- `useMcpBridge` sends JSON-RPC bridge requests for MCP Apps methods.

## Iframe Bootstrap

`app/layout.tsx` includes a small bootstrap script that helps Next.js behave inside the ChatGPT iframe.

It handles:

- Setting a `<base>` tag for the app origin.
- Detecting whether `window.openai` exists.
- Rewriting client-side navigation history to avoid full-origin URLs.
- Rewriting same-origin iframe fetches back to the app origin.
- Opening external links through `window.openai.openExternal` when available.

## Customizing The Template

Start with `app/mcp/route.ts`.

To add a new widget:

1. Add a new `WidgetDefinition`.
2. Create a Next.js page for the widget UI.
3. Register a resource with a stable URI such as `ui://widget/orders.html`.
4. Return `mimeType: "text/html;profile=mcp-app"` for MCP Apps hosts.
5. Optionally register a parallel `text/html+skybridge` resource for ChatGPT Apps SDK compatibility.
6. Register one or more tools that point to both resources through metadata.

To add a new tool:

1. Add `server.registerTool(...)`.
2. Define a Zod `inputSchema`.
3. Return user-visible `content`.
4. Return machine-readable `structuredContent`.
5. Include tool metadata that points to the widget resource.

Keep tool outputs structured and typed. The widget should read data through `useWidgetProps` rather than parsing text.

## Connecting To ChatGPT

1. Deploy the app to a public HTTPS URL, for example Vercel.
2. In ChatGPT, enable Developer Mode for apps.
3. Create an app.
4. Set the MCP server URL to:

```text
https://your-domain.example/mcp
```

5. Call `template_echo` to render the starter widget.

`baseUrl.ts` derives the app origin in local development and Vercel deployments. If you deploy somewhere else, adapt that file to your hosting environment.

## Verification

Run:

```bash
pnpm tsc --noEmit
pnpm run build
```

Useful local MCP smoke checks:

```bash
curl -i http://localhost:3000/mcp
```

Expected result: `405 Method Not Allowed`. That means the MCP route exists, but a plain GET is not a valid MCP call.

List tools:

```bash
curl -i -X POST http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

You should see `template_echo` and `template_update_preferences`.

## Notes

- The sample UI renders outside ChatGPT for local development.
- Host actions such as `callTool`, `sendFollowUpMessage`, and `setWidgetState` require the ChatGPT/App host bridge.
- The template keeps both MCP Apps metadata and OpenAI Apps SDK compatibility metadata so it can work across standards-based MCP Apps hosts and current ChatGPT app rendering behavior.
