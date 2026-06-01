import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SvgIcon } from "./SvgIcon";

describe("SvgIcon", () => {
  it("渲染不崩溃", () => {
    render(<SvgIcon name="home" />);
  });

  it("生成正确的 use href", () => {
    const { container } = render(<SvgIcon name="home" />);
    const use = container.querySelector("use");
    expect(use?.getAttribute("href")).toBe("#icon-home");
  });

  it("默认不拦截外层交互元素的点击", () => {
    const { container } = render(<SvgIcon name="home" />);
    expect(container.querySelector("svg")?.getAttribute("class")).toContain("pointer-events-none");
  });

  it("应用自定义 size", () => {
    const { container } = render(<SvgIcon name="user" size={32} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
  });

  it("默认 size 为 24", () => {
    const { container } = render(<SvgIcon name="search" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("24");
  });

  it("传递 className 到 svg 元素", () => {
    const { container } = render(<SvgIcon name="menu" className="text-red-500" />);
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("text-red-500")).toBe(true);
  });
});
