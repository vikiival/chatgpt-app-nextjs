"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert } from "@openai/apps-sdk-ui/components/Alert";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button, ButtonLink } from "@openai/apps-sdk-ui/components/Button";
import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { Input } from "@openai/apps-sdk-ui/components/Input";
import { Select } from "@openai/apps-sdk-ui/components/Select";
import {
  ArrowUpRight,
  Chat,
  CheckCircle,
  Code,
  Expand,
  PopOutWindow,
} from "@openai/apps-sdk-ui/components/Icon";
import {
  useCallTool,
  useWidgetProps,
  useMaxHeight,
  useDisplayMode,
  useRequestDisplayMode,
  useIsChatGptApp,
  useSendMessage,
  useOpenExternal,
  useWidgetState,
  useMcpBridge,
} from "./hooks";

type StarterOutput = {
  name?: string;
  mode?: "overview" | "hooks" | "bridge";
  message?: string;
  timestamp?: string;
  preferences?: {
    density?: "comfortable" | "compact";
    showBridgeHints?: boolean;
  };
};

type WidgetState = {
  notes: string;
  localMode: "overview" | "hooks" | "bridge";
};

const modeOptions = [
  { value: "overview", label: "Overview" },
  { value: "hooks", label: "Hooks" },
  { value: "bridge", label: "Bridge" },
] as const;

export default function Home() {
  const toolOutput = useWidgetProps<StarterOutput>({
    name: "Builder",
    mode: "overview",
    message:
      "Call template_echo from ChatGPT to hydrate this widget with structured content.",
  });
  const maxHeight = useMaxHeight() ?? undefined;
  const displayMode = useDisplayMode();
  const requestDisplayMode = useRequestDisplayMode();
  const isChatGptApp = useIsChatGptApp();
  const sendMessage = useSendMessage();
  const openExternal = useOpenExternal();
  const callTool = useCallTool();
  const bridge = useMcpBridge();
  const [widgetState, setWidgetState] = useWidgetState<WidgetState>({
    notes: "",
    localMode: toolOutput.mode ?? "overview",
  });
  const [name, setName] = useState(toolOutput.name ?? "Builder");
  const [selectedMode, setSelectedMode] = useState(
    toolOutput.mode ?? "overview"
  );
  const [lastAction, setLastAction] = useState("Ready");

  const mode = widgetState?.localMode ?? selectedMode;
  const rows = useMemo(
    () => [
      ["MCP endpoint", "/mcp"],
      ["Widget resource", "ui://widget/starter-widget.html"],
      ["MIME type", "text/html+skybridge"],
      ["Display mode", displayMode ?? "outside host"],
    ],
    [displayMode]
  );

  async function handlePreviewToolCall() {
    const result = await callTool("template_update_preferences", {
      density: "compact",
      showBridgeHints: true,
    });
    setLastAction(result ? "window.openai.callTool returned" : "Tool bridge unavailable outside ChatGPT");
  }

  async function handleBridgeContext() {
    try {
      await bridge.updateModelContext(
        `The starter widget is showing ${mode} mode for ${name}.`
      );
      setLastAction("MCP Apps bridge context update sent");
    } catch (error) {
      setLastAction(error instanceof Error ? error.message : "Bridge unavailable");
    }
  }

  return (
    <div
      className="min-h-screen overflow-auto bg-[var(--color-surface)] text-[var(--color-text)]"
      style={{
        maxHeight,
        height: displayMode === "fullscreen" ? maxHeight : undefined,
      }}
    >
      {displayMode !== "fullscreen" && (
        <Button
          aria-label="Enter fullscreen"
          color="secondary"
          size="sm"
          uniform
          className="fixed right-4 top-4 z-50 shadow-sm"
          onClick={() => requestDisplayMode("fullscreen")}
        >
          <Expand aria-hidden />
        </Button>
      )}
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {!isChatGptApp && (
          <Alert
            color="info"
            title="Running outside ChatGPT"
            description="The UI renders normally, and bridge actions will report graceful fallback states."
          />
        )}

        <section className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="success" pill>
              MCP ready
            </Badge>
            <Badge color="info" pill>
              Apps SDK UI
            </Badge>
            <Badge color="secondary" pill>
              Next.js
            </Badge>
          </div>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
              ChatGPT Apps SDK Next.js Starter
            </h1>
            <p className="mt-3 text-base leading-7 text-[var(--color-text-secondary)]">
              A compact template for MCP tools, iframe widgets, structured
              content, host actions, and reusable UI components.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-normal">
                  Tool output
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Structured content returned by `template_echo` appears here.
                </p>
              </div>
              <CheckCircle aria-hidden className="mt-1 size-5 text-[var(--color-success)]" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Name
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Mode
                <Select
                  options={[...modeOptions]}
                  value={selectedMode}
                  onChange={(option) => {
                    const nextMode = option.value as WidgetState["localMode"];
                    setSelectedMode(nextMode);
                    setWidgetState((state) => ({
                      notes: state?.notes ?? "",
                      localMode: nextMode,
                    }));
                  }}
                />
              </label>
            </div>

            <div className="rounded-md bg-[var(--color-surface-secondary)] p-4">
              <p className="text-sm font-medium">{toolOutput.message}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {rows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[var(--color-text-tertiary)]">
                      {label}
                    </dt>
                    <dd className="mt-1 font-mono text-xs">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button color="primary" onClick={handlePreviewToolCall}>
                <Code aria-hidden />
                Call sample tool
              </Button>
              <Button
                color="secondary"
                variant="outline"
                onClick={() =>
                  sendMessage(`Show me how to customize ${mode} mode.`)
                }
              >
                <Chat aria-hidden />
                Send follow-up
              </Button>
              <Button
                color="secondary"
                variant="ghost"
                onClick={handleBridgeContext}
              >
                <PopOutWindow aria-hidden />
                Update context
              </Button>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)]">
              Last action: {lastAction}
            </p>
          </div>

          <aside className="flex flex-col gap-4 rounded-lg border border-[var(--color-border)] p-4">
            <h2 className="text-xl font-semibold tracking-normal">
              Widget state
            </h2>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              This note is stored through `window.openai.setWidgetState` when the
              host bridge is available.
            </p>
            <textarea
              className="min-h-32 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm outline-none focus:border-[var(--color-accent)]"
              value={widgetState?.notes ?? ""}
              onChange={(event) =>
                setWidgetState((state) => ({
                  localMode: state?.localMode ?? selectedMode,
                  notes: event.target.value,
                }))
              }
              placeholder="Add local widget notes..."
            />
            {widgetState?.notes ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Saved locally for this widget lifecycle.
              </p>
            ) : (
              <EmptyMessage>
                <EmptyMessage.Title>No notes yet</EmptyMessage.Title>
                <EmptyMessage.Description>
                  Widget state is optional and safe to leave empty.
                </EmptyMessage.Description>
              </EmptyMessage>
            )}
          </aside>
        </section>

        <footer className="flex flex-wrap items-center gap-2 pt-1">
          <ButtonLink
            color="secondary"
            variant="outline"
            as={Link}
            href="/custom-page"
            prefetch={false}
          >
            Open route example
          </ButtonLink>
          <Button
            color="secondary"
            variant="ghost"
            onClick={() =>
              openExternal("https://developers.openai.com/apps-sdk")
            }
          >
            Open docs
            <ArrowUpRight aria-hidden />
          </Button>
        </footer>
      </main>
    </div>
  );
}
