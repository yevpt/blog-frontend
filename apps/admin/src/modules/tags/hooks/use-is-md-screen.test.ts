import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMdScreen } from "./use-is-md-screen";

describe("useIsMdScreen", () => {
  const listeners = new Set<() => void>();
  let matches = false;

  beforeEach(() => {
    listeners.clear();
    matches = false;
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        get matches() {
          return matches;
        },
        media: query,
        addEventListener: (_: string, listener: () => void) => {
          listeners.add(listener);
        },
        removeEventListener: (_: string, listener: () => void) => {
          listeners.delete(listener);
        },
      })),
    );
  });

  it("默认返回移动端断点", () => {
    const { result } = renderHook(() => useIsMdScreen());
    expect(result.current).toBe(false);
  });

  it("断点变化时更新", () => {
    const { result } = renderHook(() => useIsMdScreen());

    matches = true;
    act(() => {
      listeners.forEach((listener) => listener());
    });

    expect(result.current).toBe(true);
  });
});
