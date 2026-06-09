import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

export const GET = (request: NextRequest) => {
  const authRequest = new Request(
    request.url.replace(
      "/.well-known/oauth-authorization-server",
      "/api/auth/.well-known/oauth-authorization-server",
    ),
    {
      method: "GET",
      headers: request.headers,
    },
  );

  return auth.handler(authRequest);
};
