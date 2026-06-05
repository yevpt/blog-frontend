/* global document, window */
import { describe, it, expect, beforeAll } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActiveHeading } from "./use-active-heading";

// jsdom 未内置 IntersectionObserver，提供一个空实现以避免运行时报错
// 测试中 observer 不触发回调，仅验证初始状态
beforeAll(() => {
  if (typeof window.IntersectionObserver === "undefined") {
    class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  }
});

describe("useActiveHeading", () => {
  it("空列表时返回 null", () => {
    const { result } = renderHook(() => useActiveHeading([]));
    expect(result.current).toBeNull();
  });

  it("有 ids 时初始值为第一个 id", () => {
    document.body.innerHTML = `<h2 id="intro">Intro</h2><h2 id="detail">Detail</h2>`;
    const { result } = renderHook(() => useActiveHeading(["intro", "detail"]));
    // jsdom 中 IntersectionObserver 不触发，初始值为第一个
    expect(result.current).toBe("intro");
  });

  it("ids 为空数组时始终返回 null", () => {
    const { result } = renderHook(() => useActiveHeading([]));
    expect(result.current).toBeNull();
  });
});
