import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SvgSprite } from "./SvgSprite";

describe("SvgSprite", () => {
  it("渲染不崩溃", () => {
    render(<SvgSprite />);
  });

  it("将雪碧图内容注入 DOM", () => {
    const { container } = render(<SvgSprite />);
    expect(container.innerHTML).toContain("<symbol");
  });

  it("包含所有图标的 symbol 元素", () => {
    const { container } = render(<SvgSprite />);
    const expectedIcons = ["home", "user", "search", "plus", "menu", "close"];
    for (const name of expectedIcons) {
      expect(container.innerHTML).toContain(`id="icon-${name}"`);
    }
  });

  it("设置 aria-hidden 隐藏装饰性内容", () => {
    const { container } = render(<SvgSprite />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
  });
});
