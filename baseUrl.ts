function normalizeUrl(url?: string) {
  if (!url || url === "undefined") {
    return "";
  }

  const withProtocol = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/$/, "");
}

export const configuredBaseURL = normalizeUrl(
  process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL)
);

export const baseURL =
  configuredBaseURL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
