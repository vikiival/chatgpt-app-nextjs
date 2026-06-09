import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const jwksRequest = new Request(
    request.url.replace("/api/auth/mcp/jwks", "/api/auth/jwks"),
    {
      method: "GET",
      headers: request.headers,
    },
  );

  const response = await auth.handler(jwksRequest);
  if (!response.ok) {
    return response;
  }

  return NextResponse.json(await response.json(), {
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
};
