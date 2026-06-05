import type { NextConfig } from "next";
import { baseURL } from "./baseUrl";

const nextConfig: NextConfig = {
  assetPrefix: baseURL || undefined,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "connector_*.web-sandbox.oaiusercontent.com",
        "*.web-sandbox.oaiusercontent.com",
        "web-sandbox.oaiusercontent.com",
        "chatgpt.com",
        "*.chatgpt.com",
      ],
    },
  },
};

export default nextConfig;
