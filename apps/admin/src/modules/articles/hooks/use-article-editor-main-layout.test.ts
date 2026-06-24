import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { useArticleEditorMainLayout } from "./use-article-editor-main-layout";

function mockRect(element: HTMLElement, height: number, top = 80) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      height,
      width: 320,
      top,
      left: 0,
      right: 320,
      bottom: top + height,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }),
  });
}

describe("useArticleEditorMainLayout", () => {
  let layout: HTMLDivElement;
  let topBar: HTMLDivElement;
  let main: HTMLDivElement;
  let rail: HTMLElement;
  const layoutRef = createRef<HTMLDivElement>();
  const mainRef = createRef<HTMLDivElement>();
  const railRef = createRef<HTMLElement>();

  beforeEach(() => {
    vi.stubGlobal("innerHeight", 900);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("1280px"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    layout = document.createElement("div");
    topBar = document.createElement("div");
    main = document.createElement("div");
    rail = document.createElement("aside");

    mockRect(topBar, 72, 80);
    mockRect(layout, 900, 80);
    mockRect(rail, 520, 152);
    mockRect(main, 0, 152);

    layout.append(topBar);
    document.body.append(layout, main, rail);

    layoutRef.current = layout;
    mainRef.current = main;
    railRef.current = rail;
  });

  afterEach(() => {
    layout.remove();
    main.remove();
    rail.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("桌面端将主区域高度限制在可用视口与右栏高度中的较大值", () => {
    renderHook(() =>
      useArticleEditorMainLayout({
        enabled: true,
        layoutRef,
        railRef,
        mainRef,
      }),
    );

    // 900 - 80(top) - 72(topBar) - 24(gap) = 724
    expect(main.style.height).toBe("724px");
    expect(main.style.minHeight).toBe("724px");
  });

  it("右栏高于可用视口时，主区域跟随右栏高度以触发页面滚动", () => {
    mockRect(rail, 900, 152);

    renderHook(() =>
      useArticleEditorMainLayout({
        enabled: true,
        layoutRef,
        railRef,
        mainRef,
      }),
    );

    expect(main.style.height).toBe("900px");
    expect(main.style.minHeight).toBe("724px");
  });

  it("未启用时清除内联高度", () => {
    main.style.height = "640px";
    main.style.minHeight = "640px";

    renderHook(() =>
      useArticleEditorMainLayout({
        enabled: false,
        layoutRef,
        railRef,
        mainRef,
      }),
    );

    expect(main.style.height).toBe("");
    expect(main.style.minHeight).toBe("");
  });
});
