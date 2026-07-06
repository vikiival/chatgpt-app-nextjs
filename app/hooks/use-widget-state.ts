/**
 * Source: https://github.com/openai/openai-apps-sdk-examples/tree/main/src
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { useOpenAIGlobal } from "./use-openai-global";
import { registerTeardownCallback } from "./host-provider";
import type { UnknownObject } from "./types";

export function useWidgetState<T extends UnknownObject>(
  defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];

export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];

/**
 * Hook to manage widget state.
 *
 * **Persistence is ChatGPT-only.** In the ChatGPT Apps SDK, state is written
 * through `window.openai.setWidgetState`, synchronized with the parent window,
 * and survives widget minimize/restore. In standards-based MCP Apps hosts (and
 * standalone), there is no host-side persistence API, so state is kept locally
 * for the current widget lifecycle only. (A localStorage/viewUUID fallback is
 * deliberately not provided — faking persistence in a template would mislead.)
 *
 * On teardown, the latest state is flushed to the host once more where a
 * persistence API exists.
 *
 * @param defaultState - Initial state value or function to compute it
 * @returns A tuple of [state, setState] similar to useState. On ChatGPT, writes
 *          are mirrored to the host.
 *
 * @example
 * ```tsx
 * interface MyState {
 *   count: number;
 *   user: string;
 * }
 * 
 * const [state, setState] = useWidgetState<MyState>({ count: 0, user: "guest" });
 * 
 * const increment = () => {
 *   setState(prev => ({ ...prev, count: prev.count + 1 }));
 * };
 * ```
 */
export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
  const widgetStateFromWindow = useOpenAIGlobal("widgetState") as T;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }
    return typeof defaultState === "function"
      ? defaultState()
      : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromWindow);
  }, [widgetStateFromWindow]);

  // Keep a ref to the latest state so the teardown flush reads a fresh value
  // without re-registering the callback on every change.
  const stateRef = useRef(widgetState);
  stateRef.current = widgetState;

  // Flush the latest state to the host on teardown (ChatGPT only — the flush is
  // a no-op where no persistence API exists).
  useEffect(() => {
    return registerTeardownCallback(() => {
      const state = stateRef.current;
      if (
        state != null &&
        typeof window !== "undefined" &&
        window.openai?.setWidgetState
      ) {
        window.openai.setWidgetState(state);
      }
    });
  }, []);

  const setWidgetState = useCallback(
    (state: SetStateAction<T | null>) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === "function" ? state(prevState) : state;

        if (
          newState != null &&
          typeof window !== "undefined" &&
          window.openai?.setWidgetState
        ) {
          window.openai.setWidgetState(newState);
        }

        return newState;
      });
    },
    []
  );

  return [widgetState, setWidgetState] as const;
}
