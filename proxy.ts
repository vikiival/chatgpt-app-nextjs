import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS"
    );
    response.headers.set("Access-Control-Allow-Headers", "*");
    return response;
  }
  return NextResponse.next({
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export const config = {
  // Scope CORS to the routes a cross-origin host/iframe actually hits, instead
  // of wildcarding every route:
  matcher: [
    // MCP JSON-RPC endpoint — hosts POST here from a different origin.
    "/mcp/:path*",
    // Next.js assets — the widget iframe runs on the host origin and the
    // layout.tsx fetch monkey-patch re-requests these from the app origin with
    // mode: "cors".
    "/_next/:path*",
    // Widget pages served into the host iframe.
    "/",
    "/custom-page/:path*",
  ],
};
