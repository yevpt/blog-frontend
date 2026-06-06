/* global document, window */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useActiveHeading } from "./use-active-heading";

beforeEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
});

describe("useActiveHeading", () => {
  it("空列表时返回 null", () => {
    const { result } = renderHook(() => useActiveHeading([]));
    expect(result.current).toBeNull();
  });

  it("页面顶部（scrollY=0）时初始激活第一个标题", () => {
    document.body.innerHTML = `<h2 id="intro">Intro</h2><h2 id="detail">Detail</h2>`;
    const { result } = renderHook(() => useActiveHeading(["intro", "detail"]));
    expect(result.current).toBe("intro");
  });

  it("滚动到第二个标题附近时切换激活项", () => {
    document.body.innerHTML = `<h2 id="intro">Intro</h2><h2 id="detail">Detail</h2>`;
    const introEl = document.getElementById("intro")!;
    const detailEl = document.getElementById("detail")!;
    Object.defineProperty(introEl, "offsetTop", { configurable: true, value: 0 });
    Object.defineProperty(detailEl, "offsetTop", { configurable: true, value: 500 });

    const { result } = renderHook(() => useActiveHeading(["intro", "detail"]));
    expect(result.current).toBe("intro");

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 420, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    // detailEl.offsetTop (500) - scrollY (420) = 80 <= 120 → detail 激活
    expect(result.current).toBe("detail");
  });

  it("往回滚到顶部时重新激活第一个标题", () => {
    document.body.innerHTML = `<h2 id="s1">S1</h2><h2 id="s2">S2</h2>`;
    const s1 = document.getElementById("s1")!;
    const s2 = document.getElementById("s2")!;
    Object.defineProperty(s1, "offsetTop", { configurable: true, value: 0 });
    Object.defineProperty(s2, "offsetTop", { configurable: true, value: 600 });

    const { result } = renderHook(() => useActiveHeading(["s1", "s2"]));

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 500, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe("s2");

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 0, writable: true });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current).toBe("s1");
  });
});
