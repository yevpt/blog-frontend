import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { CategoryTabItem } from "@repo/api";
import { CategoriesPage } from "./categories-page";

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
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  FadeInUp: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToastQueue: class {
    add() {}
  },
}));

const categories: CategoryTabItem[] = [
  { id: 1, name: "编程", description: "代码与工程实践", seq: 0, article_count: 12 },
  { id: 2, name: "文学", description: "读书与写作", seq: 1, article_count: 8 },
  { id: 3, name: "空分类", seq: 2, article_count: 0 },
];

describe("CategoriesPage", () => {
  it("渲染页头与统计文案", () => {
    render(<CategoriesPage categories={categories} />);
    expect(screen.getByRole("heading", { level: 1, name: "文章分类" })).toBeTruthy();
    expect(screen.getByText("共 2 个分类 · 20 篇")).toBeTruthy();
  });

  it("过滤无文章的分类", () => {
    render(<CategoriesPage categories={categories} />);
    expect(screen.getByText("编程")).toBeTruthy();
    expect(screen.getByText("文学")).toBeTruthy();
    expect(screen.queryByText("空分类")).toBeNull();
  });

  it("空列表时渲染空态且不显示统计", () => {
    render(<CategoriesPage categories={[]} />);
    expect(screen.getByText("还没有公开分类，敬请期待。")).toBeTruthy();
    expect(screen.queryByText(/个分类/)).toBeNull();
  });
});
