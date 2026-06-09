import { baseURL as appBaseURL } from "@/baseUrl";
import { db } from "@/lib/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { jwt, mcp } from "better-auth/plugins";

const stripTrailingSlash = (value: string) =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const authBasePath = "/api/auth";
export const appOrigin = stripTrailingSlash(
  process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, "") ||
    appBaseURL,
);

export const authBaseURL = (() => {
  const configured = process.env.BETTER_AUTH_URL;
  if (!configured) {
    return `${appOrigin}${authBasePath}`;
  }

  const trimmed = stripTrailingSlash(configured);
  return trimmed.endsWith(authBasePath)
    ? trimmed
    : `${trimmed}${authBasePath}`;
})();

export const mcpResourceURL = stripTrailingSlash(
  process.env.MCP_RESOURCE_URL || appOrigin,
);

const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  process.env.SESSION_SECRET ||
  "development-only-change-me";

if (
  process.env.NODE_ENV === "production" &&
  authSecret === "development-only-change-me"
) {
  console.warn("BETTER_AUTH_SECRET is required for production deployments.");
}

export const auth = betterAuth({
  appName: "ChatGPT Apps SDK Next.js Starter",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: authBaseURL,
  secret: authSecret,
  trustedOrigins: [appOrigin, "https://chatgpt.com", "https://chat.openai.com"],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  disabledPaths: ["/token"],
  plugins: [
    jwt({
      disableSettingJwtHeader: true,
      jwks: {
        keyPairConfig: {
          alg: "RS256",
        },
      },
    }),
    mcp({
      loginPage: "/login",
      resource: mcpResourceURL,
      oidcConfig: {
        allowDynamicClientRegistration: true,
        loginPage: "/login",
        codeExpiresIn: 300,
        accessTokenExpiresIn: 3600,
        refreshTokenExpiresIn: 60 * 60 * 24 * 90,
        defaultScope: "openid profile email offline_access",
        scopes: [
          "openid",
          "profile",
          "email",
          "offline_access",
        ],
        trustedClients: [
          {
            clientId: "chatgpt.com",
            name: "ChatGPT",
            type: "public",
            metadata: {},
            disabled: false,
            redirectUrls: [
              "https://chatgpt.com/connector_platform_oauth_redirect",
              "https://chat.openai.com/connector_platform_oauth_redirect",
            ],
            skipConsent: true,
          },
        ],
      },
    }),
  ],
});

export type Auth = typeof auth;
