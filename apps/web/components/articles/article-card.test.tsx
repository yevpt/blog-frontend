import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { ArticleListItemResp } from "@repo/api";
import { ArticleCard } from "./article-card";

vi.mock("@repo/hooks/locale", () => ({
  useLocale: () => ({ locale: "zh", setLocale: vi.fn(), t: (k: string) => k }),
}));

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
    // 标题在 h3 内的链接（封面图链接也包含同名 img，通过 exact 匹配最小容器）
    const links = screen.getAllByRole("link", { name: "测试文章标题" });
    // 至少有一个链接（标题链接），确保其中一个 href 为 /articles/1
    expect(links.some((l) => l.getAttribute("href") === "/articles/1")).toBe(true);
  });

  it("不显示阅读量统计，只保留喜欢和评论", () => {
    render(<ArticleCard article={baseArticle} />);
    expect(screen.queryByTestId("icon-eye")).toBeNull();
    expect(screen.queryByText("100")).toBeNull();
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("阅读全文链接指向相同文章路径", () => {
    render(<ArticleCard article={baseArticle} />);
    const links = screen.getAllByRole("link", { name: "测试文章标题" });
    expect(links.some((link) => link.getAttribute("href") === "/articles/1")).toBe(true);
  });

  it("分类标签在 DOM 中位于标题之后", () => {
    render(<ArticleCard article={baseArticle} />);
    const title = screen.getByText("测试文章标题");
    const category = screen.getByText("编程");
    expect(title.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("点赞按钮可本地切换 liked 状态", async () => {
    const user = userEvent.setup();
    render(<ArticleCard article={baseArticle} />);
    const likeButton = screen.getByRole("button", { name: /喜欢/ });

    expect(likeButton).toHaveAttribute("aria-pressed", "false");
    await user.click(likeButton);
    expect(likeButton).toHaveAttribute("aria-pressed", "true");
  });
});
