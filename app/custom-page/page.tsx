"use client";

import Link from "next/link";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { ButtonLink } from "@openai/apps-sdk-ui/components/Button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] px-4 py-8 text-[var(--color-text)] sm:px-6">
      <main className="mx-auto flex max-w-3xl flex-col gap-5">
        <Badge color="info" pill>
          Route example
        </Badge>
        <h1 className="text-3xl font-semibold tracking-normal">Navigation works</h1>
        <p className="max-w-xl text-sm leading-6 text-[var(--color-text-secondary)]">
          This page demonstrates client-side navigation inside the ChatGPT app
          iframe. The layout bootstrap rewrites same-origin fetches so Next.js
          assets and RSC payloads continue to load from your app origin.
        </p>
        <ButtonLink color="primary" as={Link} href="/">
          Go to the main page
        </ButtonLink>
      </main>
    </div>
  );
}
