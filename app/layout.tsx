import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { baseURL } from "@/baseUrl";
import { AppsSDKUIProvider } from "./apps-sdk-ui-provider";
import { HostProvider } from "./hooks/host-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatGPT Apps SDK Template",
  description: "A Next.js starter for ChatGPT Apps SDK and MCP apps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <NextChatSDKBootstrap baseUrl={baseURL} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <HostProvider>
          <AppsSDKUIProvider>{children}</AppsSDKUIProvider>
        </HostProvider>
      </body>
    </html>
  );
}

function NextChatSDKBootstrap({ baseUrl }: { baseUrl: string }) {
  return (
    <>
      <base href={baseUrl}></base>
      <script>{`window.innerBaseUrl = ${JSON.stringify(baseUrl)}`}</script>
      <script>{`window.__isChatGptApp = typeof window.openai !== "undefined";`}</script>
      <script>
        {"(" +
          (() => {
            const baseUrl = window.innerBaseUrl;
            const htmlElement = document.documentElement;
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (
                  mutation.type === "attributes" &&
                  mutation.target === htmlElement
                ) {
                  const attrName = mutation.attributeName;
                  if (
                    attrName &&
                    attrName !== "suppresshydrationwarning" &&
                    attrName !== "data-theme"
                  ) {
                    htmlElement.removeAttribute(attrName);
                  }
                }
              });
            });
            observer.observe(htmlElement, {
              attributes: true,
              attributeOldValue: true,
            });

            const originalReplaceState = history.replaceState;
            history.replaceState = (s, unused, url) => {
              const u = new URL(url ?? "", window.location.href);
              const href = u.pathname + u.search + u.hash;
              originalReplaceState.call(history, unused, href);
            };

            const originalPushState = history.pushState;
            history.pushState = (s, unused, url) => {
              const u = new URL(url ?? "", window.location.href);
              const href = u.pathname + u.search + u.hash;
              originalPushState.call(history, unused, href);
            };

            const appOrigin = new URL(baseUrl).origin;
            const isInIframe = window.self !== window.top;

            window.addEventListener(
              "click",
              (e) => {
                const a = (e?.target as HTMLElement)?.closest("a");
                if (!a || !a.href) return;
                const url = new URL(a.href, window.location.href);
                if (
                  url.origin !== window.location.origin &&
                  url.origin != appOrigin
                ) {
                  try {
                    // Route external links through the host bridge so they open
                    // in the host's browser instead of navigating the iframe.
                    // ChatGPT: window.openai.openExternal. MCP Apps: the
                    // connected App's openLink, exposed by HostProvider as
                    // window.__mcpOpenLink.
                    if (
                      window.openai &&
                      "openExternal" in window.openai &&
                      typeof window.openai.openExternal === "function"
                    ) {
                      window.openai.openExternal({ href: a.href });
                      e.preventDefault();
                    } else if (typeof window.__mcpOpenLink === "function") {
                      window.__mcpOpenLink(a.href);
                      e.preventDefault();
                    }
                  } catch {
                    console.warn(
                      "openExternal failed, likely not in a host client"
                    );
                  }
                }
              },
              true
            );

            if (isInIframe && window.location.origin !== appOrigin) {
              const originalFetch = window.fetch;

              window.fetch = (input: URL | RequestInfo, init?: RequestInit) => {
                let url: URL;
                if (typeof input === "string" || input instanceof URL) {
                  url = new URL(input, window.location.href);
                } else {
                  url = new URL(input.url, window.location.href);
                }

                const rewrite = () => {
                  if (typeof input === "string" || input instanceof URL) {
                    input = url.toString();
                  } else {
                    input = new Request(url.toString(), input);
                  }
                };

                if (url.origin === appOrigin) {
                  // Already targeting the app origin — rewrite the input value
                  // so a relative Request resolves against the right base.
                  rewrite();
                } else if (url.origin === window.location.origin) {
                  // Same-origin (host origin) request — rewrite it back to the
                  // app origin so it hits the deployed assets/routes.
                  const newUrl = new URL(baseUrl);
                  newUrl.pathname = url.pathname;
                  newUrl.search = url.search;
                  newUrl.hash = url.hash;
                  url = newUrl;
                  rewrite();
                }

                // Only force CORS when the (possibly rewritten) target is
                // actually cross-origin. Forcing mode:"cors" unconditionally can
                // break no-cors or credentialed same-origin requests, so pass
                // init through untouched otherwise.
                if (url.origin !== window.location.origin) {
                  return originalFetch.call(window, input, {
                    ...init,
                    mode: "cors",
                  });
                }

                return originalFetch.call(window, input, init);
              };
            }
          }).toString() +
          ")()"}
      </script>
    </>
  );
}
