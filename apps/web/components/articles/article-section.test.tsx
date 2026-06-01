import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ArticleSection } from "./article-section";
import type { Article } from "@/app/_mock/types";

// Mock next/image：渲染为普通 <img>
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    priority: _priority,
    className,
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    priority?: boolean;
    className?: string;
    sizes?: string;
  }) => <img src={src} alt={alt} className={className} />,
}));

// Mock next/link：渲染为普通 <a>
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [_: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock @repo/icons
vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

// Mock @repo/ui — Pagination + Tabs系列 + SearchField
vi.mock("@repo/ui", () => ({
  Pagination: ({
    currentPage,
    totalPages,
    onPageChange,
    className,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
  }) => (
    <nav aria-label="分页导航" className={className}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="上一页"
      >
        上一页
      </button>
      <span data-testid="pagination-info">
        {currentPage}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="下一页"
      >
        下一页
      </button>
    </nav>
  ),
  // Tabs: 事件委托将点击传给 onSelectionChange（无 React context）
  Tabs: ({
    children,
    onSelectionChange,
  }: {
    children: ReactNode;
    selectedKey?: string;
    onSelectionChange?: (key: string) => void;
  }) => {
    const handleSelect = (e: { target: EventTarget | null }) => {
      const btn = (e.target as HTMLElement).closest("button[data-tab-id]");
      if (btn && onSelectionChange) {
        onSelectionChange(btn.getAttribute("data-tab-id") ?? "");
      }
    };
    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div onClick={handleSelect} onKeyDown={handleSelect}>
        {children}
      </div>
    );
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsItem: ({ children, id }: { children: ReactNode; id?: string; variant?: string }) => (
    // role 保持隐式 button，避免与 getByRole("button") 冲突
    <button data-tab-id={id}>{children}</button>
  ),
  TabsPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SearchField: ({
    placeholder,
    value,
    onChange,
  }: {
    label?: string;
    placeholder?: string;
    value?: string;
    onChange?: (val: string) => void;
    size?: string;
    inputClassName?: string;
  }) => (
    <input
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

// Mock ArticleCard：避免依赖真实组件的类型约束（ArticleCard 已迁移到 ArticleListItemResp）
vi.mock("./article-card", () => ({
  ArticleCard: ({ article }: { article: { title: string } }) => (
    <div data-testid="article-card">{article.title}</div>
  ),
}));

// Mock @repo/hooks useLocale
vi.mock("@repo/hooks", () => ({
  useLocale: () => ({
    locale: "zh",
    setLocale: () => undefined,
    t: (key: string) => {
      const messages: Record<string, string> = {
        "article.searchPlaceholder": "搜索文章...",
      };
      return messages[key] ?? key;
    },
  }),
}));

// 生成测试文章数据（12 篇，覆盖多个分类）
function makeArticle(id: string, overrides: Partial<Article> = {}): Article {
  return {
    id,
    title: `测试文章标题 ${id}`,
    excerpt: `测试文章摘要内容 ${id}`,
    coverImage: `https://example.com/image${id}.jpg`,
    category: "编程",
    publishedAt: new Date("2025-01-01"),
    views: 100,
    likes: 10,
    comments: 5,
    href: `/articles/test-${id}`,
    ...overrides,
  };
}

// 12 篇文章：6编程 + 3工具 + 3文学，足以触发分页（ARTICLES_PER_PAGE = 6）
const mockArticles: Article[] = [
  makeArticle("1", { category: "编程", title: "TypeScript 文章一" }),
  makeArticle("2", { category: "编程", title: "TypeScript 文章二" }),
  makeArticle("3", { category: "编程", title: "TypeScript 文章三" }),
  makeArticle("4", { category: "编程", title: "TypeScript 文章四" }),
  makeArticle("5", { category: "编程", title: "TypeScript 文章五" }),
  makeArticle("6", { category: "编程", title: "TypeScript 文章六" }),
  makeArticle("7", { category: "工具", title: "工具分类文章甲" }),
  makeArticle("8", { category: "工具", title: "工具分类文章乙" }),
  makeArticle("9", { category: "工具", title: "工具分类文章丙" }),
  makeArticle("10", { category: "文学", title: "文学分类文章甲" }),
  makeArticle("11", { category: "文学", title: "文学分类文章乙" }),
  makeArticle("12", { category: "文学", title: "文学分类文章丙" }),
];

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ArticleSection", () => {
  it("渲染不崩溃，显示第一页文章列表", () => {
    render(<ArticleSection articles={mockArticles} />);
    // 第一页应显示前 6 篇
    expect(screen.getByText("TypeScript 文章一")).toBeTruthy();
    expect(screen.getByText("TypeScript 文章六")).toBeTruthy();
    // 第 7 篇不在第一页
    expect(screen.queryByText("工具分类文章甲")).toBeNull();
  });

  it("ArticleCard 显示文章标题", () => {
    render(<ArticleSection articles={mockArticles} />);
    expect(screen.getByText("TypeScript 文章一")).toBeTruthy();
    expect(screen.getByText("TypeScript 文章二")).toBeTruthy();
  });

  it("文章数 > ARTICLES_PER_PAGE 时分页导航存在", () => {
    render(<ArticleSection articles={mockArticles} />);
    expect(screen.getByRole("navigation", { name: "分页导航" })).toBeTruthy();
  });

  it("文章数 <= ARTICLES_PER_PAGE 时不显示分页", () => {
    const fewArticles = mockArticles.slice(0, 4);
    render(<ArticleSection articles={fewArticles} />);
    expect(screen.queryByRole("navigation", { name: "分页导航" })).toBeNull();
  });

  it("点击分类 Tab 过滤文章", async () => {
    const user = userEvent.setup();
    render(<ArticleSection articles={mockArticles} />);

    // 通过 aria-pressed 确保点击的是 Tab 按钮（有多个"工具"文本时用 getAllByText[0]）
    const toolsTab = screen.getByRole("button", { name: "工具" });
    await act(async () => {
      await user.click(toolsTab);
    });

    // 工具分类文章应可见
    expect(screen.getByText("工具分类文章甲")).toBeTruthy();
    expect(screen.getByText("工具分类文章乙")).toBeTruthy();

    // 编程分类文章不应显示
    expect(screen.queryByText("TypeScript 文章一")).toBeNull();
  });

  it("点击分类 Tab 后重置到第一页", async () => {
    const user = userEvent.setup();
    render(<ArticleSection articles={mockArticles} />);

    // 先翻到第二页
    const nextBtn = screen.getByRole("button", { name: "下一页" });
    await act(async () => {
      await user.click(nextBtn);
    });

    // 切换到文学分类
    const literatureTab = screen.getByRole("button", { name: "文学" });
    await act(async () => {
      await user.click(literatureTab);
    });

    // 文学分类文章可见（第 1 页）
    expect(screen.getByText("文学分类文章甲")).toBeTruthy();
  });

  it("搜索框输入后防抖 300ms 更新文章列表", async () => {
    render(<ArticleSection articles={mockArticles} />);

    const input = screen.getByPlaceholderText("搜索文章...");

    // 直接用 fireEvent 输入，绕开 userEvent 的内部计时器问题
    act(() => {
      fireEvent.change(input, { target: { value: "工具分类" } });
    });

    // 此时防抖未触发（300ms 还没过），编程文章仍显示
    expect(screen.getByText("TypeScript 文章一")).toBeTruthy();

    // 等待防抖触发（>300ms）
    await waitFor(
      () => {
        expect(screen.getByText("工具分类文章甲")).toBeTruthy();
      },
      { timeout: 1000 },
    );

    expect(screen.queryByText("TypeScript 文章一")).toBeNull();
  });

  it("全部分类默认显示所有文章的第一页", () => {
    render(<ArticleSection articles={mockArticles} />);
    // 默认"全部"，显示前 6 篇编程文章
    expect(screen.getByText("TypeScript 文章一")).toBeTruthy();
    expect(screen.getByText("TypeScript 文章二")).toBeTruthy();
    expect(screen.getByText("TypeScript 文章三")).toBeTruthy();
    expect(screen.getByText("TypeScript 文章四")).toBeTruthy();
    expect(screen.getByText("TypeScript 文章五")).toBeTruthy();
    expect(screen.getByText("TypeScript 文章六")).toBeTruthy();
    // 第 7 篇（工具分类文章甲）不在第一页
    expect(screen.queryByText("工具分类文章甲")).toBeNull();
  });
});
