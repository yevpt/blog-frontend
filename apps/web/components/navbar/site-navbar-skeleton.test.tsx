import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SiteNavbarSkeleton } from "./site-navbar-skeleton";

describe("SiteNavbarSkeleton", () => {
  it("渲染稳定锚点与加载语义", () => {
    const { container } = render(<SiteNavbarSkeleton />);
    const skeleton = container.querySelector("#navbar-skeleton");

    expect(skeleton).toBeTruthy();
    expect(skeleton).toHaveAttribute("aria-label", "导航加载中");
    expect(skeleton?.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("桌面端骨架包含 logo、导航链接与操作区占位", () => {
    const { container } = render(<SiteNavbarSkeleton />);
    const desktopRow = container.querySelector(".md\\:flex");

    expect(desktopRow).toBeTruthy();
    expect(desktopRow?.querySelectorAll(".bg-muted").length).toBeGreaterThanOrEqual(7);
  });

  it("文章详情页移动端骨架展示返回与操作区占位", () => {
    const { container } = render(<SiteNavbarSkeleton mobileVariant="article" />);
    const mobileRow = container.querySelector(".md\\:hidden");

    expect(mobileRow?.querySelectorAll(".bg-muted").length).toBe(4);
  });

  it("内页移动端骨架展示返回、标题与菜单占位", () => {
    const { container } = render(<SiteNavbarSkeleton mobileVariant="default" />);
    const mobileRow = container.querySelector(".md\\:hidden");

    expect(mobileRow?.querySelectorAll(".bg-muted").length).toBe(3);
  });
});
