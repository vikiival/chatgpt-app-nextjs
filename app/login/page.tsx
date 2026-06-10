"use client";

import { FormEvent, useMemo, useState } from "react";
import { authClient } from "@/lib/auth/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

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

    const result = await authClient.signIn.magicLink({
      email,
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL: "/login",
    });

    setIsSubmitting(false);

    if (result.error) {
      setStatus(result.error.message || "Could not send the sign-in link.");
      return;
    }

    setIsSent(true);
  };

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-neutral-950">
      <section className="mx-auto flex max-w-md flex-col gap-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-neutral-500">
            ChatGPT Apps SDK Starter
          </p>
          <h1 className="text-4xl font-semibold tracking-normal">
            Check your email
          </h1>
          <p className="text-base leading-7 text-neutral-600">
            Enter your email and we will send a secure link to finish
            authorizing ChatGPT.
          </p>
        </div>

        {isSent ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800">
            We sent a sign-in link to <strong>{email}</strong>. Open it in this
            browser to continue the OAuth flow.
          </div>
        ) : (
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
              {isSubmitting ? "Sending..." : "Send sign-in link"}
            </button>
          </form>
        )}

        {isSent ? (
          <button
            className="self-start text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline"
            type="button"
            onClick={() => {
              setIsSent(false);
              setStatus(null);
            }}
          >
            Use a different email
          </button>
        ) : null}
      </section>
    </main>
  );
}
