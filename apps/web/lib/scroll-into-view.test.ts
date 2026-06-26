// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runAfterSmoothScroll, scrollIntoViewBelowFixedHeader } from "./scroll-into-view";

describe("scrollIntoViewBelowFixedHeader", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    Object.defineProperty(window, "scrollY", { value: 100, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.getElementById("navbar")?.remove();
  });

  it("按顶栏高度与间距计算 scrollTop", () => {
    const navbar = document.createElement("nav");
    navbar.id = "navbar";
    vi.spyOn(navbar, "getBoundingClientRect").mockReturnValue({
      height: 72,
      top: 0,
      bottom: 72,
      left: 0,
      right: 0,
      width: 390,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    document.body.appendChild(navbar);

    const target = document.createElement("div");
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      top: 300,
      bottom: 400,
      left: 0,
      right: 0,
      width: 390,
      height: 100,
      x: 0,
      y: 300,
      toJSON: () => ({}),
    });

    scrollIntoViewBelowFixedHeader(target, { gap: 12 });

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 100 + 300 - 72 - 12,
      behavior: "smooth",
    });
  });
});

describe("runAfterSmoothScroll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("超时后执行回调", () => {
    const callback = vi.fn();
    runAfterSmoothScroll(callback, 300);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(callback).toHaveBeenCalledOnce();
  });
});
