import { describe, expect, it } from "vitest";
import { computeFloatDockContentBounds, computeFloatDockLeft } from "./float-dock-position";
import { ARTICLE_FLOAT_DOCK_LAYOUT, pageContainerFloatDockLayout } from "./float-dock-layouts";

describe("pageContainerFloatDockLayout", () => {
  it("default 960 宽屏落在主栏右侧留白", () => {
    const layout = pageContainerFloatDockLayout("default");
    expect(computeFloatDockLeft(1440, layout, false)).toBe(1245);
  });
});

describe("computeFloatDockContentBounds", () => {
  it("宽屏无目录时计算右侧留白", () => {
    expect(computeFloatDockContentBounds(1440, ARTICLE_FLOAT_DOCK_LAYOUT, false)).toEqual({
      gutterStart: 1080,
      gutterWidth: 344,
    });
  });
});

describe("computeFloatDockLeft", () => {
  it("移动端返回 null", () => {
    expect(computeFloatDockLeft(390, ARTICLE_FLOAT_DOCK_LAYOUT, false)).toBeNull();
  });

  it("宽屏无目录时落在留白区偏正文侧", () => {
    expect(computeFloatDockLeft(1440, ARTICLE_FLOAT_DOCK_LAYOUT, false)).toBe(1180);
  });

  it("宽屏有目录时落在目录右侧留白", () => {
    const withoutToc = computeFloatDockLeft(1440, ARTICLE_FLOAT_DOCK_LAYOUT, false);
    const withToc = computeFloatDockLeft(1440, ARTICLE_FLOAT_DOCK_LAYOUT, true);
    expect(withToc).not.toBeNull();
    expect(withoutToc).not.toBeNull();
    expect(withToc!).toBeGreaterThan(withoutToc!);
    expect(withToc).toBe(1294);
  });

  it("右侧留白低于最小宽度时回退贴边", () => {
    expect(computeFloatDockLeft(800, ARTICLE_FLOAT_DOCK_LAYOUT, false)).toBeNull();
  });
});
