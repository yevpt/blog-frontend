import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ArticleListItemResp } from "@repo/api";
import { ArticleCard } from "./article-card";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
    sizes?: string;
  }) => <img src={src} alt={alt} className={className} />,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

vi.mock("@repo/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const baseArticle: ArticleListItemResp = {
  id: 1,
  title: "测试文章标题",
  cover_img_url: "https://example.com/cover.jpg",
  short_content: "这是文章摘要",
  user_id: 1,
  status: 1,
  comment_status: 1,
  read_count: 100,
  like_count: 20,
  comment_count: 5,
  is_recommended: false,
  category: { id: 1, name: "编程" },
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ArticleCard", () => {
  it("渲染不崩溃，显示标题", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByText("测试文章标题")).toBeTruthy();
  });

  it("显示文章摘要", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByText("这是文章摘要")).toBeTruthy();
  });

  it("显示分类名称", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByText("编程")).toBeTruthy();
  });

  it("有封面图时渲染 img", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.getByAltText("测试文章标题")).toBeTruthy();
  });

  it("无封面图时不渲染 img", () => {
    render(<ArticleCard article={{ ...baseArticle, cover_img_url: undefined }} />);
    expect(screen.queryByAltText("测试文章标题")).toBeNull();
  });

  it("无分类时不渲染分类标签", () => {
    render(<ArticleCard article={{ ...baseArticle, category: undefined }} />);
    expect(screen.queryByText("编程")).toBeNull();
  });

  it("标题链接指向 /articles/{id}", () => {
    render(<ArticleCard article={baseArticle} />);
    const links = screen.getAllByRole("link", { name: "测试文章标题" });
    expect(links.some((l) => l.getAttribute("href") === "/articles/1")).toBe(true);
  });

  it("分类标签在 DOM 中位于标题之前", () => {
    render(<ArticleCard article={baseArticle} />);
    const category = screen.getByText("编程");
    const title = screen.getByText("测试文章标题");
    // DOCUMENT_POSITION_FOLLOWING (4): title 在 category 之后
    expect(category.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("点击爱心按钮切换 liked 状态", () => {
    render(<ArticleCard article={baseArticle} />);
    const likeBtn = screen.getByRole("button", { name: "喜欢" });
    expect(likeBtn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(likeBtn);
    expect(screen.getByRole("button", { name: "取消喜欢" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("点击评论按钮触发 onCommentClick 回调", () => {
    const onCommentClick = vi.fn();
    render(<ArticleCard article={baseArticle} onCommentClick={onCommentClick} />);
    fireEvent.click(screen.getByRole("button", { name: "查看评论" }));
    expect(onCommentClick).toHaveBeenCalledWith({
      title: "测试文章标题",
      type: "编程",
    });
  });

  it("不再显示阅读量图标", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.queryByTestId("icon-eye")).toBeNull();
  });
});
