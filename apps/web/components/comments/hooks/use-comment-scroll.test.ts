// @vitest-environment jsdom
/* global HTMLDivElement, document */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCommentScroll } from "./use-comment-scroll";

describe("useCommentScroll", () => {
  it("返回 scrollRef 与两个滚动方法", () => {
    const { result } = renderHook(() => useCommentScroll({}));
    expect(typeof result.current.scrollRef).toBe("function");
    expect(typeof result.current.scrollToListTop).toBe("function");
    expect(typeof result.current.scrollToComment).toBe("function");
  });

  it("scrollRef 回调会把节点写入外部 ref", () => {
    const externalRef = { current: null as HTMLDivElement | null };
    const { result } = renderHook(() => useCommentScroll({ externalScrollRef: externalRef }));
    const node = document.createElement("div");
    result.current.scrollRef(node);
    expect(externalRef.current).toBe(node);
  });

  it("节点尺寸变化时回调 onContentResize", () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    let trigger: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          trigger = cb;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const onContentResize = vi.fn();
    const { result } = renderHook(() => useCommentScroll({ onContentResize }));
    result.current.scrollRef(document.createElement("div"));
    trigger?.();
    expect(onContentResize).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
