"use client";

import Link from "next/link";
import { AppsSDKUIProvider as Provider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";

declare global {
  interface AppsSDKUIConfig {
    LinkComponent: typeof Link;
  }
}

export function AppsSDKUIProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <Provider linkComponent={Link}>{children}</Provider>;
}
