import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export const GET = (request: NextRequest) => {
  const authRequest = new Request(
    request.url.replace(
      "/.well-known/oauth-protected-resource",
      "/api/auth/.well-known/oauth-protected-resource",
    ),
    {
      method: "GET",
      headers: request.headers,
    },
  );

  return auth.handler(authRequest);
};
