"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a retry callback. */
  fallback?: (error: Error, retry: () => void) => ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Class error boundary with a retry action, wrapping the widget so a render
 * error in a host iframe shows a recoverable message instead of a blank frame.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Widget error boundary caught an error:", error, info);
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.retry);
      }
      return (
        <div
          role="alert"
          className="mx-auto flex min-h-[8rem] max-w-lg flex-col items-start gap-3 p-6"
        >
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm opacity-80">{error.message}</p>
          <button
            type="button"
            onClick={this.retry}
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
