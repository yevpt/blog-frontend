import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAnalyticsRange } from "./use-analytics-range";

describe("useAnalyticsRange", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 5, 26, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("默认返回包含今天的近 7 天范围", () => {
    const { result } = renderHook(() => useAnalyticsRange());

    expect(result.current.preset).toBe("7d");
    expect(result.current.query).toEqual({ from: "2026-06-20", to: "2026-06-26" });
    expect(result.current.label).toBe("近 7 天");
  });

  it("支持近 30 天和自定义范围", () => {
    const { result } = renderHook(() => useAnalyticsRange());

    act(() => result.current.setPreset("30d"));
    expect(result.current.query).toEqual({ from: "2026-05-28", to: "2026-06-26" });

    act(() => {
      result.current.setCustomFrom("2026-06-10");
      result.current.setCustomTo("2026-06-12");
    });

    expect(result.current.preset).toBe("custom");
    expect(result.current.query).toEqual({ from: "2026-06-10", to: "2026-06-12" });
    expect(result.current.label).toBe("2026-06-10 至 2026-06-12");
  });
});
