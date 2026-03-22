import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useReducedMotion } from "../src/hooks/useReducedMotion";

describe("useReducedMotion", () => {
  let listeners: Array<(e: MediaQueryListEvent) => void> = [];
  let matches = false;

  beforeEach(() => {
    listeners = [];
    matches = false;
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches,
          media: query,
          onchange: null,
          addEventListener: (
            _: string,
            handler: (e: MediaQueryListEvent) => void,
          ) => {
            listeners.push(handler);
          },
          removeEventListener: (
            _: string,
            handler: (e: MediaQueryListEvent) => void,
          ) => {
            listeners = listeners.filter((l) => l !== handler);
          },
          dispatchEvent: () => true,
          addListener: () => {},
          removeListener: () => {},
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false by default (no reduced motion preference)", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when user prefers reduced motion", () => {
    matches = true;
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("reacts to media query changes", () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it("cleans up listener on unmount", () => {
    const { unmount } = renderHook(() => useReducedMotion());
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
