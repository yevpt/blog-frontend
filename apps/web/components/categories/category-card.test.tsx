import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { CategoryTabItem } from "@repo/api";
import { CategoryCard } from "./category-card";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/hooks", () => ({
  useDeferredMediaActivation: () => true,
  useImageLoadPlaceholder: () => ({
    isLoading: false,
    state: undefined,
    hideImage: false,
    renderPlaceholder: false,
    placeholderOpaque: false,
    animateImage: false,
  }),
  shouldDeferRemoteMediaSrc: () => false,
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const base: CategoryTabItem = {
  id: 1,
  name: "编程",
  description: "代码与工程实践",
  seq: 0,
  article_count: 12,
};

describe("CategoryCard", () => {
  it("渲染名称、描述与文章数", () => {
    render(<CategoryCard category={base} />);
    expect(screen.getByText("编程")).toBeTruthy();
    expect(screen.getByText("代码与工程实践")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("篇")).toBeTruthy();
  });

  it("整卡链接指向分类详情页", () => {
    render(<CategoryCard category={base} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/categories/1");
  });

  it("有封面时左侧视觉块用封面缩略图", () => {
    render(<CategoryCard category={{ ...base, cover_img_url: "https://example.com/cover.png" }} />);
    expect(screen.getByRole("img", { name: "编程" }).getAttribute("src")).toBe(
      "https://example.com/cover.png",
    );
  });

  it("无封面有图标时视觉块用图标", () => {
    const { container } = render(
      <CategoryCard category={{ ...base, icon: "https://example.com/icon.svg" }} />,
    );
    expect(container.querySelector('img[src="https://example.com/icon.svg"]')).toBeTruthy();
    expect(screen.queryByText("编")).toBeNull();
  });

  it("无封面无图标时视觉块用色块首字", () => {
    const { container } = render(<CategoryCard category={base} />);
    expect(container.querySelector(".bg-blue-500")).toBeTruthy();
    expect(screen.getByText("编")).toBeTruthy();
  });

  it("无描述时渲染占位文案", () => {
    render(<CategoryCard category={{ ...base, description: undefined }} />);
    expect(screen.getByText("这个分类还没有简介")).toBeTruthy();
  });
});
