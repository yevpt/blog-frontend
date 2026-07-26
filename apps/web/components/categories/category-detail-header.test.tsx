import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { CategoryTabItem } from "@repo/api";
import { CategoryDetailHeader } from "./category-detail-header";

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

vi.mock("@repo/ui", () => ({
  cn: (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(" "),
  FadeInUp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const base: CategoryTabItem = {
  id: 1,
  name: "编程",
  description: "代码与工程实践",
  icon: "https://example.com/icon.svg",
  seq: 0,
  article_count: 12,
};

describe("CategoryDetailHeader", () => {
  it("渲染分类名、描述与文章数", () => {
    render(<CategoryDetailHeader category={base} />);
    expect(screen.getByRole("heading", { level: 1, name: "编程" })).toBeTruthy();
    expect(screen.getByText("代码与工程实践")).toBeTruthy();
    expect(screen.getByText("12 篇")).toBeTruthy();
  });

  it("渲染返回全部分类链接", () => {
    render(<CategoryDetailHeader category={base} />);
    expect(screen.getByRole("link", { name: /全部分类/ }).getAttribute("href")).toBe("/categories");
  });

  it("渲染该分类的 RSS 订阅链接", () => {
    render(<CategoryDetailHeader category={base} />);
    const rss = screen.getByRole("link", { name: /订阅/ });
    expect(rss.getAttribute("href")).toBe("/categories/1/feed.xml");
    expect(rss.getAttribute("target")).toBe("_blank");
  });

  it("无描述时不渲染描述段落", () => {
    render(<CategoryDetailHeader category={{ ...base, description: undefined }} />);
    expect(screen.queryByText("代码与工程实践")).toBeNull();
  });

  it("无图标时不渲染图标图", () => {
    const { container } = render(<CategoryDetailHeader category={{ ...base, icon: undefined }} />);
    expect(container.querySelector("img")).toBeNull();
  });
});
