"use client";

import { FormEvent, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("Builder");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const callbackURL = useMemo(() => {
    if (typeof window === "undefined") {
      return "/";
    }

    return new URLSearchParams(window.location.search).get("callbackURL") || "/";
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({
            email,
            password,
            callbackURL,
          })
        : await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL,
          });

    setIsSubmitting(false);

    if (result.error) {
      setStatus(result.error.message || "Authentication failed.");
      return;
    }

    window.location.href = callbackURL;
  };

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-neutral-950">
      <section className="mx-auto flex max-w-md flex-col gap-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-neutral-500">
            ChatGPT Apps SDK Starter
          </p>
          <h1 className="text-4xl font-semibold tracking-normal">
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-base leading-7 text-neutral-600">
            Use this account to authorize ChatGPT through the MCP OAuth flow.
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {mode === "sign-up" ? (
            <label className="flex flex-col gap-2 text-sm font-medium">
              Name
              <input
                className="h-12 rounded-md border border-neutral-300 px-3 text-base outline-none focus:border-neutral-950"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-2 text-sm font-medium">
            Email
            <input
              className="h-12 rounded-md border border-neutral-300 px-3 text-base outline-none focus:border-neutral-950"
              autoComplete="email"
              inputMode="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <input
              className="h-12 rounded-md border border-neutral-300 px-3 text-base outline-none focus:border-neutral-950"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {status ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {status}
            </p>
          ) : null}

          <button
            className="h-12 rounded-md bg-neutral-950 px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Working..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          className="self-start text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline"
          type="button"
          onClick={() =>
            setMode((current) =>
              current === "sign-in" ? "sign-up" : "sign-in",
            )
          }
        >
          {mode === "sign-in"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
