import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { ArticlePageResp, CategoryTabItem } from "@repo/api";
import { ArticleSection } from "./article-section";

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
    children: ReactNode;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@repo/icons", () => ({
  SvgIcon: ({ name, size }: { name: string; size?: number }) => (
    <span data-testid={`icon-${name}`} data-size={size} />
  ),
}));

vi.mock("@repo/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
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
      <div role="presentation" onClick={handleSelect} onKeyDown={handleSelect}>
        {children}
      </div>
    );
  },
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsItem: ({ children, id }: { children: ReactNode; id?: string; variant?: string }) => (
    <button data-tab-id={id}>{children}</button>
  ),
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

function makeArticle(id: number, title: string) {
  return {
    id,
    title,
    user_id: 1,
    status: 1,
    comment_status: 1,
    read_count: 10,
    like_count: 2,
    comment_count: 1,
    is_recommended: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function makePageResp(overrides: Partial<ArticlePageResp> = {}): ArticlePageResp {
  return {
    total: 2,
    pages: 1,
    page: 1,
    page_size: 10,
    list: [makeArticle(1, "文章一"), makeArticle(2, "文章二")],
    ...overrides,
  };
}

const mockCategories: CategoryTabItem[] = [
  { id: 1, name: "编程", seq: 0, article_count: 10 },
  { id: 2, name: "工具", seq: 1, article_count: 5 },
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("ArticleSection", () => {
  it("渲染初始数据，不触发 fetch", () => {
    render(<ArticleSection initialPage={makePageResp()} categories={mockCategories} />);
    expect(screen.getByText("文章一")).toBeTruthy();
    expect(screen.getByText("文章二")).toBeTruthy();
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("pages <= 1 时不显示分页", () => {
    render(<ArticleSection initialPage={makePageResp({ pages: 1 })} categories={mockCategories} />);
    expect(screen.queryByRole("navigation", { name: "分页导航" })).toBeNull();
  });

  it("pages > 1 时显示分页", () => {
    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );
    expect(screen.getByRole("navigation", { name: "分页导航" })).toBeTruthy();
  });

  it("点击分类 Tab 后以 category_id 参数 fetch 第一页", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => makePageResp({ list: [makeArticle(3, "编程文章")] }),
    } as Response);

    render(<ArticleSection initialPage={makePageResp()} categories={mockCategories} />);

    const tab = screen.getByRole("button", { name: "编程" });
    await act(async () => {
      await user.click(tab);
    });

    await waitFor(() => {
      const call = vi.mocked(fetch).mock.calls[0][0] as string;
      const url = new URL(call, "http://localhost");
      expect(url.pathname).toBe("/api/articles");
      expect(url.searchParams.get("category_id")).toBe("1");
      expect(url.searchParams.get("page")).toBe("1");
    });

    await waitFor(() => {
      expect(screen.getByText("编程文章")).toBeTruthy();
    });
  });

  it("点击下一页后以正确 page 参数 fetch", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => makePageResp({ page: 2, list: [makeArticle(11, "第二页文章")] }),
    } as Response);

    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );

    const nextBtn = screen.getByRole("button", { name: "下一页" });
    await act(async () => {
      await user.click(nextBtn);
    });

    await waitFor(() => {
      const call = vi.mocked(fetch).mock.calls[0][0] as string;
      const url = new URL(call, "http://localhost");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("category_id")).toBeNull();
    });

    await waitFor(() => {
      expect(screen.getByText("第二页文章")).toBeTruthy();
    });
  });

  it("切换分类后页码重置为 1", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePageResp({ page: 2, pages: 3, list: [makeArticle(5, "第二页")] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => makePageResp({ list: [makeArticle(6, "编程第一页")] }),
      } as Response);

    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "下一页" }));
    });
    await waitFor(() => expect(screen.getByText("第二页")).toBeTruthy());

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "编程" }));
    });

    await waitFor(() => {
      const secondCall = vi.mocked(fetch).mock.calls[1][0] as string;
      const url = new URL(secondCall, "http://localhost");
      expect(url.searchParams.get("page")).toBe("1");
      expect(url.searchParams.get("category_id")).toBe("1");
    });
  });

  it("翻页后调用 scrollIntoView 平滑滚动到文章区顶部", async () => {
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => makePageResp({ page: 2, list: [makeArticle(11, "第二页文章")] }),
    } as Response);

    const user = userEvent.setup();
    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );

    await act(async () => {
      await user.click(screen.getByRole("button", { name: "下一页" }));
    });

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    });
  });

  it("加载中显示骨架屏，加载完成后显示文章", async () => {
    let resolveResponse!: (val: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((r) => {
          resolveResponse = r;
        }),
    );

    render(
      <ArticleSection
        initialPage={makePageResp({ total: 25, pages: 3 })}
        categories={mockCategories}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    });

    // 加载中：原文章文字消失（骨架屏无文字内容）
    await waitFor(() => {
      expect(screen.queryByText("文章一")).toBeNull();
      expect(screen.queryByText("文章二")).toBeNull();
    });

    // 解决 fetch，文章出现
    await act(async () => {
      resolveResponse({
        ok: true,
        json: async () => makePageResp({ page: 2, list: [makeArticle(11, "骨架屏测试文章")] }),
      } as Response);
    });

    await waitFor(() => {
      expect(screen.getByText("骨架屏测试文章")).toBeTruthy();
    });
  });
});
